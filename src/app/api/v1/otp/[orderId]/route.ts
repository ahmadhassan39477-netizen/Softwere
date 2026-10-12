import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getSmsProvider } from "@/lib/providers/sms";
import { creditWallet } from "@/lib/wallet";

type Ctx = { params: Promise<{ orderId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { orderId } = await ctx.params;
  const rl = rateLimit(`otp:${user.id}:${orderId}`, 120);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
  });
  if (!order) return jsonError("Order not found", 404);

  if (order.status === "RECEIVED") {
    return Response.json(
      { status: order.status, code: order.otpCode, message: order.otpMessage, expiresAt: order.expiresAt },
      { headers: rateLimitHeaders(rl) },
    );
  }

  if (["CANCELLED", "REFUNDED", "EXPIRED"].includes(order.status)) {
    return Response.json(
      { status: order.status, code: null, message: null, expiresAt: order.expiresAt },
      { headers: rateLimitHeaders(rl) },
    );
  }

  if (order.expiresAt.getTime() < Date.now()) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "EXPIRED", refundedAt: new Date() },
    });
    await creditWallet(user.id, order.price, {
      type: "REFUND",
      method: "system",
      externalId: order.id,
      meta: JSON.stringify({ reason: "expired_no_otp" }),
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "REFUNDED" },
    });
    return Response.json(
      { status: "REFUNDED", code: null, message: null, expiresAt: order.expiresAt },
      { headers: rateLimitHeaders(rl) },
    );
  }

  if (order.providerOrderId) {
    const provider = getSmsProvider(order.providerKey);
    const otp = await provider.getOtp(order.providerOrderId);
    if (otp.status === "RECEIVED" && otp.code) {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status: "RECEIVED", otpCode: otp.code, otpMessage: otp.message },
      });
      return Response.json(
        {
          status: updated.status,
          code: updated.otpCode,
          message: updated.otpMessage,
          expiresAt: updated.expiresAt,
        },
        { headers: rateLimitHeaders(rl) },
      );
    }
  }

  return Response.json(
    { status: order.status, code: null, message: null, expiresAt: order.expiresAt },
    { headers: rateLimitHeaders(rl) },
  );
}
