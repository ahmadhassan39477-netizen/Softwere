import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/providers/payments";
import { creditWallet } from "@/lib/wallet";
import { jsonError } from "@/lib/api-auth";

/** Payment provider IPN / webhook stub with signature validation. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature =
    req.headers.get("x-nowpayments-sig") ??
    req.headers.get("x-signature") ??
    null;

  if (!verifyWebhookSignature(raw, signature)) {
    return jsonError("Invalid signature", 401);
  }

  let payload: {
    order_id?: string;
    payment_status?: string;
    status?: string;
    amount?: string | number;
    user_id?: string;
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return jsonError("Invalid JSON");
  }

  const externalId = payload.order_id;
  const status = payload.payment_status ?? payload.status;
  if (!externalId) return jsonError("Missing order_id");

  const pending = await prisma.transaction.findFirst({
    where: { externalId, status: "PENDING", type: "DEPOSIT" },
  });

  if (!pending) {
    return Response.json({ ok: true, message: "No pending deposit" });
  }

  if (status === "finished" || status === "COMPLETED" || status === "confirmed") {
    await creditWallet(pending.userId, pending.amount, {
      type: "DEPOSIT",
      method: pending.method ?? "crypto_nowpayments",
      status: "COMPLETED",
      externalId: `${externalId}:settled`,
      meta: JSON.stringify({ webhook: true }),
    });
    await prisma.transaction.update({
      where: { id: pending.id },
      data: { status: "COMPLETED" },
    });
  } else if (status === "failed" || status === "expired") {
    await prisma.transaction.update({
      where: { id: pending.id },
      data: { status: "FAILED" },
    });
  }

  return Response.json({ ok: true });
}
