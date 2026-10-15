import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { purchaseNumber } from "@/lib/purchase-number";

const schema = z.object({
  countryCode: z.string().min(2).max(4),
  serviceSlug: z.string().min(1),
  server: z.number().int().min(1).max(3).default(1),
});

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`purchase:${user.id}`, 30);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input");

  try {
    const order = await purchaseNumber({
      userId: user.id,
      countryCode: parsed.data.countryCode,
      serviceSlug: parsed.data.serviceSlug,
      server: parsed.data.server,
    });
    return Response.json({ order }, { status: 201, headers: rateLimitHeaders(rl) });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return jsonError(e instanceof Error ? e.message : "Purchase failed", status);
  }
}
