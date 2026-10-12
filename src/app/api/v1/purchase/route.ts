import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { debitWallet } from "@/lib/wallet";
import { getSmsProvider } from "@/lib/providers/sms";
import { decimalJson } from "@/lib/money";

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

  const country = await prisma.country.findUnique({
    where: { code: parsed.data.countryCode.toUpperCase() },
  });
  if (!country?.enabled) return jsonError("Country unavailable", 404);

  const service = await prisma.service.findUnique({
    where: { slug: parsed.data.serviceSlug },
  });
  if (!service?.enabled) return jsonError("Service unavailable", 404);

  const offer = await prisma.serviceOffer.findUnique({
    where: {
      countryId_serviceId_server: {
        countryId: country.id,
        serviceId: service.id,
        server: parsed.data.server,
      },
    },
  });
  if (!offer?.enabled || offer.stock <= 0) return jsonError("Out of stock", 409);

  const ttlSetting = await prisma.setting.findUnique({ where: { key: "order_ttl_minutes" } });
  const ttlMin = Number(ttlSetting?.value ?? 15);
  const expiresAt = new Date(Date.now() + ttlMin * 60_000);

  try {
    await debitWallet(user.id, offer.price, {
      type: "PURCHASE",
      method: "balance",
      meta: JSON.stringify({
        country: country.code,
        service: service.slug,
        server: parsed.data.server,
      }),
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Payment failed", 402);
  }

  const provider = getSmsProvider(offer.providerKey);
  let purchase;
  try {
    purchase = await provider.purchase({
      countryCode: country.code,
      serviceSlug: service.slug,
      server: parsed.data.server,
    });
  } catch (e) {
    // Best-effort refund on provider failure
    const { creditWallet } = await import("@/lib/wallet");
    await creditWallet(user.id, offer.price, {
      type: "REFUND",
      method: "system",
      meta: JSON.stringify({ reason: "provider_purchase_failed" }),
    });
    return jsonError(e instanceof Error ? e.message : "Provider error", 502);
  }

  await prisma.serviceOffer.update({
    where: { id: offer.id },
    data: { stock: { decrement: 1 } },
  });

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      countryId: country.id,
      serviceId: service.id,
      server: parsed.data.server,
      phoneNumber: purchase.phoneNumber,
      status: "ACTIVE",
      price: offer.price,
      providerOrderId: purchase.providerOrderId,
      providerKey: offer.providerKey,
      expiresAt,
    },
    include: { country: true, service: true },
  });

  return Response.json(
    {
      order: {
        id: order.id,
        phoneNumber: order.phoneNumber,
        status: order.status,
        price: decimalJson(order.price),
        server: order.server,
        expiresAt: order.expiresAt.toISOString(),
        country: { code: order.country.code, name: order.country.name, flag: order.country.flag },
        service: { slug: order.service.slug, name: order.service.name },
      },
    },
    { status: 201, headers: rateLimitHeaders(rl) },
  );
}
