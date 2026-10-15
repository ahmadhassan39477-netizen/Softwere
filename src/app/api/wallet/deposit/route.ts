import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createDepositIntent } from "@/lib/providers/payments";
import { creditWallet } from "@/lib/wallet";
import { decimalJson } from "@/lib/money";

const schema = z.object({
  amount: z.number().positive().max(10000),
  method: z.enum([
    "mock_instant",
    "crypto_nowpayments",
    "crypto_cryptomus",
    "binance_pay",
    "perfect_money",
    "manual",
  ]),
  currency: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`deposit:${user.id}`, 20);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input");

  // Production: block self-serve auto-credit paths — WhatsApp + Admin top-up only
  if (
    parsed.data.method === "mock_instant" &&
    (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production")
  ) {
    return jsonError(
      "Demo deposits are disabled. Open WhatsApp on /deposit — message us to add credit after payment.",
      403,
    );
  }

  let intent;
  try {
    intent = await createDepositIntent({
      userId: user.id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      currency: parsed.data.currency,
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Deposit unavailable", 400);
  }

  if (intent.status === "COMPLETED") {
    const { balanceAfter, transaction } = await creditWallet(user.id, intent.amount, {
      type: "DEPOSIT",
      method: intent.method,
      status: "COMPLETED",
      externalId: intent.id,
    });
    return Response.json(
      {
        intent,
        balance: decimalJson(balanceAfter),
        transactionId: transaction.id,
      },
      { headers: rateLimitHeaders(rl) },
    );
  }

  const txn = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: "DEPOSIT",
      amount: intent.amount,
      balanceAfter: (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).balance,
      method: intent.method,
      status: "PENDING",
      externalId: intent.id,
      meta: JSON.stringify({ payAddress: intent.payAddress, payUrl: intent.payUrl }),
    },
  });

  return Response.json(
    { intent, transactionId: txn.id },
    { status: 201, headers: rateLimitHeaders(rl) },
  );
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const txns = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Response.json({
    transactions: txns.map((t) => ({
      id: t.id,
      type: t.type,
      amount: decimalJson(t.amount),
      balanceAfter: decimalJson(t.balanceAfter),
      method: t.method,
      status: t.status,
      createdAt: t.createdAt,
    })),
  });
}
