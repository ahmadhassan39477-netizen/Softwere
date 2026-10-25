import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import { adjustWalletDebit, creditWallet } from "@/lib/wallet";
import { decimalJson } from "@/lib/money";

const schema = z.object({
  userId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  amount: z.number().positive().max(50000),
  note: z.string().max(500).optional(),
  /** credit = deposit (default); debit = cut/reduce balance (ADJUSTMENT, floor 0) */
  direction: z.enum(["credit", "debit"]).default("credit"),
  /** Optional idempotency key for debit/credit retries */
  idempotencyKey: z.string().min(4).max(120).optional(),
});

/**
 * Admin-only wallet adjust:
 * - direction=credit: top up after WhatsApp payment (unchanged default).
 * - direction=debit: cut mistaken funds; balance never goes negative (clamped to 0).
 * Auditable ledger row includes admin id + note. Does not remove wallet-audit-correct.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input — need amount and userId or email");

  if (!parsed.data.userId && !parsed.data.email) {
    return jsonError("Provide userId or email");
  }

  const target = parsed.data.userId
    ? await prisma.user.findUnique({ where: { id: parsed.data.userId } })
    : await prisma.user.findUnique({
        where: { email: parsed.data.email!.toLowerCase() },
      });

  if (!target) return jsonError("User not found", 404);

  const direction = parsed.data.direction;
  const note =
    parsed.data.note ??
    (direction === "debit" ? "Admin balance cut" : "WhatsApp payment confirmed");
  const externalId = parsed.data.idempotencyKey
    ? `admin-wallet:${direction}:${parsed.data.idempotencyKey}`
    : undefined;

  if (direction === "debit") {
    const result = await adjustWalletDebit(target.id, parsed.data.amount, {
      type: "ADJUSTMENT",
      method: "admin_debit",
      externalId,
      meta: JSON.stringify({
        byAdmin: admin.id,
        adminEmail: admin.email,
        note,
        requested: parsed.data.amount,
        direction: "debit",
      }),
    });

    return Response.json({
      direction: "debit",
      user: {
        id: target.id,
        email: target.email,
        balance: decimalJson(result.balanceAfter),
      },
      transactionId: result.transaction?.id ?? null,
      requested: parsed.data.amount.toFixed(4),
      debited: decimalJson(result.debited),
      credited: undefined,
      clamped: result.clamped,
      idempotent: result.idempotent,
      note,
    });
  }

  if (externalId) {
    const prior = await prisma.transaction.findFirst({
      where: { userId: target.id, externalId, status: "COMPLETED" },
    });
    if (prior) {
      const fresh = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
      return Response.json({
        direction: "credit",
        user: {
          id: target.id,
          email: target.email,
          balance: decimalJson(fresh.balance),
        },
        transactionId: prior.id,
        credited: decimalJson(prior.amount),
        idempotent: true,
        note,
      });
    }
  }

  const { balanceAfter, transaction } = await creditWallet(target.id, parsed.data.amount, {
    type: "DEPOSIT",
    method: "whatsapp_manual",
    status: "COMPLETED",
    externalId,
    meta: JSON.stringify({
      byAdmin: admin.id,
      adminEmail: admin.email,
      note,
      direction: "credit",
    }),
  });

  return Response.json({
    direction: "credit",
    user: {
      id: target.id,
      email: target.email,
      balance: decimalJson(balanceAfter),
    },
    transactionId: transaction.id,
    credited: parsed.data.amount.toFixed(4),
    idempotent: false,
    note,
  });
}
