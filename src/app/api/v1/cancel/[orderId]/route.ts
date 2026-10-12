import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getSmsProvider } from "@/lib/providers/sms";
import { creditWallet } from "@/lib/wallet";
import { decimalJson } from "@/lib/money";

type Ctx = { params: Promise<{ orderId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { orderId } = await ctx.params;
  const rl = rateLimit(`cancel:${user.id}`, 30);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
  });
  if (!order) return jsonError("Order not found", 404);
  if (!["ACTIVE", "PENDING"].includes(order.status)) {
    return jsonError(`Cannot cancel order in status ${order.status}`, 409);
  }
  if (order.otpCode) return jsonError("OTP already received", 409);

  const cancelWindow = await prisma.setting.findUnique({
    where: { key: "cancel_window_seconds" },
  });
  const windowSec = Number(cancelWindow?.value ?? 120);
  const ageSec = (Date.now() - order.createdAt.getTime()) / 1000;
  if (ageSec > windowSec) {
    return jsonError(`Manual cancel only allowed within ${windowSec}s of purchase`, 403);
  }

  if (order.providerOrderId) {
    try {
      await getSmsProvider(order.providerKey).cancel(order.providerOrderId);
    } catch {
      // continue with local cancel/refund
    }
  }

  await creditWallet(user.id, order.price, {
    type: "REFUND",
    method: "system",
    externalId: order.id,
    meta: JSON.stringify({ reason: "manual_cancel" }),
  });

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "REFUNDED", cancelledAt: new Date(), refundedAt: new Date() },
  });

  return Response.json(
    {
      order: {
        id: updated.id,
        status: updated.status,
        refunded: decimalJson(updated.price),
      },
    },
    { headers: rateLimitHeaders(rl) },
  );
}
