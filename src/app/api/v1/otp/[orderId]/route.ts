import { NextRequest } from "next/server";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { pollOrder } from "@/lib/sms/order-lifecycle";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ orderId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { orderId } = await ctx.params;
  const rl = rateLimit(`otp:${user.id}:${orderId}`, 120);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const owned = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { id: true },
  });
  if (!owned) return jsonError("Order not found", 404);

  const result = await pollOrder(orderId);
  return Response.json(
    {
      status: result?.status ?? "EXPIRED",
      code: result?.code ?? null,
      message: result?.message ?? null,
      expiresAt: result?.expiresAt,
    },
    { headers: rateLimitHeaders(rl) },
  );
}
