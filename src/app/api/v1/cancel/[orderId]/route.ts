import { NextRequest } from "next/server";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { cancelOrder } from "@/lib/sms/order-lifecycle";
import { decimalJson } from "@/lib/money";

type Ctx = { params: Promise<{ orderId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { orderId } = await ctx.params;
  const rl = rateLimit(`cancel:${user.id}`, 30);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  try {
    const updated = await cancelOrder(orderId, user.id);
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
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return jsonError(e instanceof Error ? e.message : "Cancel failed", status);
  }
}
