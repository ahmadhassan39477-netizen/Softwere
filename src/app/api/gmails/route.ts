import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { listGmailOffers } from "@/lib/gmail-catalog";
import { purchaseGmail } from "@/lib/purchase-gmail";
import { sanitizeCustomerBuyError } from "@/lib/sms/customer-errors";

/** Guest-safe copy — never name wholesale brands. */
function readyMessage(ready: boolean, reason?: string, count = 0): string {
  if (!ready) {
    return "Gmails go live when Extra stock is connected. Sign in to buy a temporary @gmail.com address for verification.";
  }
  if (count === 0) {
    return "No Gmail stock right now. Check back shortly or try another service.";
  }
  return "Temporary @gmail.com addresses for verification. Retail is wholesale plus 40%. Sign in required to buy.";
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const catalog = await listGmailOffers();
  return Response.json({
    ready: catalog.ready,
    markupPercent: catalog.markupPercent,
    message: readyMessage(catalog.ready, catalog.reason, catalog.offers.length),
    offers: catalog.offers.map((o) => ({
      serviceSlug: o.serviceSlug,
      serviceName: o.serviceName,
      domain: o.domain,
      retail: o.retail,
      stock: o.stock,
      quality: o.quality,
      successAttempts: o.successAttempts,
      successHits: o.successHits,
      // maxPrice kept for buy — wholesale ceiling; not shown as brand
      maxPrice: o.maxPrice,
    })),
  });
}

const buySchema = z.object({
  serviceSlug: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`gmails-buy:${user.id}`, 20);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const body = await req.json().catch(() => null);
  const parsed = buySchema.safeParse(body);
  if (!parsed.success) return jsonError("Choose a Gmail service", 400, rateLimitHeaders(rl));

  try {
    const result = await purchaseGmail({
      userId: user.id,
      serviceSlug: parsed.data.serviceSlug,
    });
    return Response.json(result, { status: 201, headers: rateLimitHeaders(rl) });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    const raw = e instanceof Error ? e.message : "Purchase failed";
    return Response.json(
      { error: sanitizeCustomerBuyError(raw) },
      { status, headers: rateLimitHeaders(rl) },
    );
  }
}
