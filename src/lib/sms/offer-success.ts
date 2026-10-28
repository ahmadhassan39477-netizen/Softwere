import { prisma } from "@/lib/prisma";
import type { ProviderPriceRow } from "./types";

type Numish = number | string | { toString(): string } | null | undefined;

function asNumber(v: Numish): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : 0;
}

/** Wholesale price bucket string (2 decimals) for ranking keys. */
export function priceBucket(wholesale: Numish): string {
  const n = asNumber(wholesale);
  if (!(n >= 0)) return "0.00";
  return n.toFixed(2);
}

/** Retail → approximate wholesale assuming 20% markup (legacy orders without cost). */
export function wholesaleFromRetail(
  retail: Numish,
  markupPercent = 20,
): number {
  const r = asNumber(retail);
  const m = Number(markupPercent);
  if (!(r > 0)) return 0;
  const denom = 1 + (Number.isFinite(m) && m > 0 ? m : 20) / 100;
  return r / denom;
}

export type SuccessStatKey = {
  server: number;
  countryCode: string;
  serviceSlug: string;
  operator: string;
  priceBucket: string;
};

export type SuccessStatRow = SuccessStatKey & {
  attempts: number;
  successes: number;
  /** Laplace-smoothed success rate in [0,1] */
  quality: number;
};

export function successKey(parts: SuccessStatKey): string {
  return [
    parts.server,
    parts.countryCode.toUpperCase(),
    parts.serviceSlug.toLowerCase(),
    (parts.operator || "").toLowerCase(),
    parts.priceBucket,
  ].join("|");
}

/**
 * Ranking quality in [0,1].
 * Rule (documented for operators):
 * 1. Shop history for (server, country, service, operator, priceBucket) when attempts > 0
 *    → Laplace (successes+1)/(attempts+2).
 * 2. Else same route ignoring operator (operator="") when that has attempts.
 * 3. Else provider delivery rate / 100 when present (5SIM rate).
 * 4. Else neutral 0.45 prior (unknown — do not invent stock or fake certainty).
 */
export function qualityScore(opts: {
  attempts?: number;
  successes?: number;
  fallbackAttempts?: number;
  fallbackSuccesses?: number;
  providerRate?: number | null;
}): number {
  const a = opts.attempts ?? 0;
  const s = opts.successes ?? 0;
  if (a > 0) return (s + 1) / (a + 2);
  const fa = opts.fallbackAttempts ?? 0;
  const fs = opts.fallbackSuccesses ?? 0;
  if (fa > 0) return (fs + 1) / (fa + 2);
  const rate = opts.providerRate;
  if (typeof rate === "number" && Number.isFinite(rate) && rate >= 0) {
    return Math.min(1, Math.max(0, rate / 100));
  }
  return 0.45;
}

type CacheEntry = { at: number; map: Map<string, SuccessStatRow> };
let cache: CacheEntry | null = null;
const CACHE_MS = 45_000;

export async function loadSuccessStatMap(force = false): Promise<Map<string, SuccessStatRow>> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.map;
  try {
    const rows = await prisma.offerSuccessStat.findMany();
    const map = new Map<string, SuccessStatRow>();
    for (const r of rows) {
      const row: SuccessStatRow = {
        server: r.server,
        countryCode: r.countryCode,
        serviceSlug: r.serviceSlug,
        operator: r.operator,
        priceBucket: r.priceBucket,
        attempts: r.attempts,
        successes: r.successes,
        quality: qualityScore({ attempts: r.attempts, successes: r.successes }),
      };
      map.set(successKey(row), row);
    }
    cache = { at: Date.now(), map };
    return map;
  } catch {
    return cache?.map ?? new Map();
  }
}

export function lookupQuality(
  map: Map<string, SuccessStatRow>,
  parts: SuccessStatKey,
  providerRate?: number | null,
): { quality: number; attempts: number; successes: number } {
  const exact = map.get(successKey(parts));
  const fallback = map.get(
    successKey({ ...parts, operator: "" }),
  );
  const quality = qualityScore({
    attempts: exact?.attempts,
    successes: exact?.successes,
    fallbackAttempts: fallback?.attempts,
    fallbackSuccesses: fallback?.successes,
    providerRate,
  });
  return {
    quality,
    attempts: exact?.attempts ?? fallback?.attempts ?? 0,
    successes: exact?.successes ?? fallback?.successes ?? 0,
  };
}

/** Record one terminal outcome (OTP received vs cancelled/refunded/expired). */
export async function recordOfferOutcome(input: {
  server: number;
  countryCode: string;
  serviceSlug: string;
  operator?: string | null;
  wholesaleCost?: Numish;
  retailPrice?: Numish;
  success: boolean;
}): Promise<void> {
  const countryCode = input.countryCode.toUpperCase();
  const serviceSlug = input.serviceSlug.toLowerCase();
  const operator = (input.operator ?? "").trim().toLowerCase();
  let wholesale = asNumber(input.wholesaleCost);
  if (!(wholesale > 0) && input.retailPrice != null) {
    wholesale = wholesaleFromRetail(input.retailPrice);
  }
  const bucket = priceBucket(wholesale);
  try {
    await prisma.offerSuccessStat.upsert({
      where: {
        server_countryCode_serviceSlug_operator_priceBucket: {
          server: input.server,
          countryCode,
          serviceSlug,
          operator,
          priceBucket: bucket,
        },
      },
      create: {
        server: input.server,
        countryCode,
        serviceSlug,
        operator,
        priceBucket: bucket,
        attempts: 1,
        successes: input.success ? 1 : 0,
      },
      update: {
        attempts: { increment: 1 },
        successes: input.success ? { increment: 1 } : undefined,
      },
    });
    cache = null;
  } catch {
    /* schema may not be pushed yet — never break OTP poll */
  }
}

/**
 * Rebuild OfferSuccessStat from Order history (Admin sync / first deploy).
 * Uses wholesaleCost when present; else retail ÷ 1.20.
 */
export async function rebuildOfferSuccessStatsFromOrders(): Promise<{
  rows: number;
  ordersScanned: number;
}> {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["RECEIVED", "CANCELLED", "REFUNDED", "EXPIRED"] },
    },
    select: {
      server: true,
      status: true,
      otpCode: true,
      price: true,
      wholesaleCost: true,
      operator: true,
      country: { select: { code: true } },
      service: { select: { slug: true } },
    },
    take: 5_000,
  });

  type Agg = { attempts: number; successes: number };
  const agg = new Map<string, Agg & SuccessStatKey>();

  for (const o of orders) {
    const success = o.status === "RECEIVED" || Boolean(o.otpCode);
    // Skip pure ACTIVE leftovers — only terminal
    if (!["RECEIVED", "CANCELLED", "REFUNDED", "EXPIRED"].includes(o.status)) continue;
    let wholesale = Number(o.wholesaleCost ?? 0);
    if (!(wholesale > 0)) wholesale = wholesaleFromRetail(o.price);
    const parts: SuccessStatKey = {
      server: o.server,
      countryCode: o.country.code.toUpperCase(),
      serviceSlug: o.service.slug.toLowerCase(),
      operator: (o.operator ?? "").trim().toLowerCase(),
      priceBucket: priceBucket(wholesale),
    };
    const k = successKey(parts);
    const cur = agg.get(k) ?? { ...parts, attempts: 0, successes: 0 };
    cur.attempts += 1;
    if (success) cur.successes += 1;
    agg.set(k, cur);
  }

  await prisma.offerSuccessStat.deleteMany({});
  const values = [...agg.values()];
  if (values.length > 0) {
    await prisma.offerSuccessStat.createMany({
      data: values.map((v) => ({
        server: v.server,
        countryCode: v.countryCode,
        serviceSlug: v.serviceSlug,
        operator: v.operator,
        priceBucket: v.priceBucket,
        attempts: v.attempts,
        successes: v.successes,
      })),
    });
  }
  cache = null;
  return { rows: values.length, ordersScanned: orders.length };
}

/** Sort live wholesale rows: quality desc, then price asc. */
export function rankProviderRows(
  rows: ProviderPriceRow[],
  server: number,
  stats: Map<string, SuccessStatRow>,
): Array<ProviderPriceRow & { quality: number; successAttempts: number; successHits: number }> {
  const scored = rows.map((r) => {
    const q = lookupQuality(
      stats,
      {
        server,
        countryCode: r.countryCode,
        serviceSlug: r.serviceSlug,
        operator: (r.operator ?? "").toLowerCase(),
        priceBucket: priceBucket(r.wholesale),
      },
      r.providerRate,
    );
    return {
      ...r,
      quality: q.quality,
      successAttempts: q.attempts,
      successHits: q.successes,
    };
  });
  scored.sort((a, b) => {
    if (b.quality !== a.quality) return b.quality - a.quality;
    return a.wholesale - b.wholesale;
  });
  return scored;
}

/** Max live offers shown per service on one server tab. */
export const MAX_OFFERS_PER_SERVICE = 8;
