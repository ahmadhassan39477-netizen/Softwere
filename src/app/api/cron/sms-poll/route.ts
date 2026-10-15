import { NextRequest } from "next/server";
import { pollActiveOrders } from "@/lib/sms/order-lifecycle";

/**
 * Hobby-friendly SMS poll cron. Protect with CRON_SECRET when set.
 * Vercel Hobby minimum cron is often 1/day — live order SSE also polls ~3s.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results = await pollActiveOrders(50);
  return Response.json({
    polled: results.length,
    received: results.filter((r) => r?.status === "RECEIVED").length,
    refunded: results.filter((r) => r?.status === "REFUNDED").length,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
