import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import { decimalJson } from "@/lib/money";
import {
  priceBucket,
  rebuildOfferSuccessStatsFromOrders,
  wholesaleFromRetail,
} from "@/lib/sms/offer-success";

/**
 * GET — aggregate OTP success from Order history (sitewide + optional email).
 * POST { rebuild: true } — rebuild OfferSuccessStat from terminal orders.
 * Never returns secrets or full phones.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const take = Math.min(
    5_000,
    Math.max(50, Number(req.nextUrl.searchParams.get("take") ?? 2000) || 2000),
  );

  let userId: string | undefined;
  let userMeta: { id: string; email: string; orderCount: number } | null = null;
  if (email) {
    const resolved = await prisma.user.findFirst({
      where: { email },
      select: { id: true, email: true, _count: { select: { orders: true } } },
    });
    if (!resolved) return jsonError("User not found", 404);
    userId = resolved.id;
    userMeta = {
      id: resolved.id,
      email: resolved.email,
      orderCount: resolved._count.orders,
    };
  }

  const orders = await prisma.order.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      status: true,
      server: true,
      providerKey: true,
      price: true,
      wholesaleCost: true,
      operator: true,
      networkLabel: true,
      otpCode: true,
      createdAt: true,
      country: { select: { code: true, name: true } },
      service: { select: { slug: true, name: true } },
      user: { select: { email: true } },
    },
  });

  type Agg = {
    server: number;
    providerKey: string;
    country: string;
    service: string;
    operator: string;
    networkLabel: string;
    priceBucket: string;
    retailSample: string;
    ok: number;
    fail: number;
  };
  const map = new Map<string, Agg>();

  for (const o of orders) {
    const success = o.status === "RECEIVED" || Boolean(o.otpCode);
    let wholesale = Number(o.wholesaleCost ?? 0);
    if (!(wholesale > 0)) wholesale = wholesaleFromRetail(o.price);
    const bucket = priceBucket(wholesale);
    const operator = (o.operator ?? "").trim().toLowerCase() || "(unknown)";
    const key = [
      o.server,
      o.providerKey,
      o.country.code,
      o.service.slug,
      operator,
      bucket,
    ].join("|");
    const cur = map.get(key) ?? {
      server: o.server,
      providerKey: o.providerKey,
      country: o.country.code,
      service: o.service.slug,
      operator,
      networkLabel: o.networkLabel ?? operator,
      priceBucket: bucket,
      retailSample: decimalJson(o.price),
      ok: 0,
      fail: 0,
    };
    if (success) cur.ok += 1;
    else if (["CANCELLED", "REFUNDED", "EXPIRED"].includes(o.status)) cur.fail += 1;
    else if (o.status === "RECEIVED") cur.ok += 1;
    else {
      // ACTIVE/PENDING still open — skip for rate
      continue;
    }
    map.set(key, cur);
  }

  const rows = [...map.values()]
    .map((r) => {
      const total = r.ok + r.fail;
      return {
        ...r,
        total,
        successRate: total ? r.ok / total : 0,
      };
    })
    .sort((a, b) => b.successRate - a.successRate || b.total - a.total);

  const stored = await prisma.offerSuccessStat
    .findMany({ orderBy: [{ successes: "desc" }, { attempts: "desc" }], take: 100 })
    .catch(() => []);

  return Response.json({
    scope: userMeta ? { user: userMeta } : { sitewide: true },
    ordersScanned: orders.length,
    rankingRule:
      "Shop sorts live offers by Laplace-smoothed success for (server, country, service, operator, wholesale price band), then by price. Provider delivery rate fills gaps when history is empty.",
    diagnosis: rows.slice(0, 80),
    topWins: rows.filter((r) => r.ok >= 2).slice(0, 20),
    topFails: [...rows].filter((r) => r.fail >= 3).sort((a, b) => b.fail - a.fail).slice(0, 20),
    storedStats: stored.map((s) => ({
      server: s.server,
      countryCode: s.countryCode,
      serviceSlug: s.serviceSlug,
      operator: s.operator || "(any)",
      priceBucket: s.priceBucket,
      attempts: s.attempts,
      successes: s.successes,
      rate: s.attempts ? s.successes / s.attempts : 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);
  const body = await req.json().catch(() => ({}));
  if (!body?.rebuild) return jsonError("Pass { rebuild: true }");
  const result = await rebuildOfferSuccessStatsFromOrders();
  return Response.json({ ok: true, ...result });
}
