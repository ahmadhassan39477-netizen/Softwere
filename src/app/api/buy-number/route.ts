import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { purchaseNumber } from "@/lib/purchase-number";

const schema = z.object({
  countryCode: z.string().min(2).max(4),
  serviceSlug: z.string().min(1),
  service: z.string().min(1).optional(),
  country: z.string().min(2).max(4).optional(),
  server: z.number().int().min(1).max(3).default(1),
  operator: z.string().min(1).max(64).optional(),
  networkLabel: z.string().min(1).max(80).optional(),
  maxPrice: z.number().positive().max(500).optional(),
});

/**
 * POST /api/buy-number
 * Body: { serviceSlug|service, countryCode|country, server? }
 * Checks wallet, tries 5SIM then SMS-Activate (mock if keys missing),
 * deducts only on success, returns { phoneNumber, orderId }.
 */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`buy-number:${user.id}`, 30);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input");

  const countryCode = (parsed.data.countryCode || parsed.data.country || "").toUpperCase();
  const serviceSlug = parsed.data.serviceSlug || parsed.data.service || "";
  if (!countryCode || !serviceSlug) return jsonError("service and country required");

  try {
    const order = await purchaseNumber({
      userId: user.id,
      countryCode,
      serviceSlug,
      server: parsed.data.server,
      operator: parsed.data.operator,
      networkLabel: parsed.data.networkLabel,
      maxPrice: parsed.data.maxPrice,
    });
    return Response.json(
      {
        orderId: order.id,
        phoneNumber: order.phoneNumber,
        order,
      },
      { status: 201, headers: rateLimitHeaders(rl) },
    );
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return jsonError(e instanceof Error ? e.message : "Purchase failed", status);
  }
}
