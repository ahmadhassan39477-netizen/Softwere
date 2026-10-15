import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { cancelOrder } from "@/lib/sms/order-lifecycle";
import { decimalJson } from "@/lib/money";

const schema = z.object({
  orderId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`orders-cancel:${user.id}`, 30);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input");

  try {
    const updated = await cancelOrder(parsed.data.orderId, user.id);
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
