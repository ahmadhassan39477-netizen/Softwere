import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { decimalJson } from "@/lib/money";
import { ensureCatalogSeeded, ensureCountryOffers } from "@/lib/ensure-catalog";
import { FALLBACK_SERVICES } from "@/lib/catalog-fallback";
import { worldCountryByCode } from "@/lib/world-countries";
import { fetchLiveStockBySlot, type SlotLiveStock } from "@/lib/sms/live-stock";
import {
  DEFAULT_SLOT_MARKUP,
  loadProviderSlots,
  retailFromWholesale,
} from "@/lib/sms/provider-slots";
import {
  loadSuccessStatMap,
  MAX_OFFERS_PER_SERVICE,
  rankProviderRows,
} from "@/lib/sms/offer-success";
import { isPlausibleMarkedUpOtp } from "@/lib/sms/otp-price-guards";
import type { ProviderPriceRow } from "@/lib/sms/types";

async function slotMarkupMap(): Promise<Record<number, number>> {
  try {
    const slots = await loadProviderSlots();
    const map: Record<number, number> = {
      1: DEFAULT_SLOT_MARKUP,
      2: DEFAULT_SLOT_MARKUP,
      3: DEFAULT_SLOT_MARKUP,
    };
    for (const s of slots) {
      map[s.priority] = s.markupPercent > 0 ? s.markupPercent : DEFAULT_SLOT_MARKUP;
    }
    return map;
  } catch {
    return { 1: DEFAULT_SLOT_MARKUP, 2: DEFAULT_SLOT_MARKUP, 3: DEFAULT_SLOT_MARKUP };
  }
}

/** Plain per-tab copy — never brands, env vars, or Admin paste steps. */
function slotCustomerMessage(entry: SlotLiveStock | undefined): string {
  if (!entry) return "This server isn’t available right now. Try another server or Auto.";
  if (entry.bySlug.size > 0) return "Live stock available.";
  if (entry.status === "disabled") {
    return "This server is offline right now. Try another server or Auto.";
  }
  if (entry.status === "no_key") {
    return "This server isn’t available right now. Try another server or Auto.";
  }
  if (entry.status === "error") {
    return "This server had a temporary error. Try another server or Auto.";
  }
  return "No numbers on this server right now. Try another server or Auto.";
}

function synthServices(
  countryCode: string,
  q: string,
  markups: Record<number, number>,
) {
  const fb = worldCountryByCode(countryCode) ?? worldCountryByCode("US")!;
  return {
    country: {
      id: `world-${fb.code}`,
      code: fb.code,
      name: fb.name,
      flag: fb.flag,
    },
    services: FALLBACK_SERVICES.filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.slug.includes(q),
    ).map((s) => ({
      id: `fallback-${s.slug}`,
      slug: s.slug,
      name: s.name,
      category: s.category,
      offers: [1, 2, 3].map((server) => {
        // Distinct placeholders only — never identical across servers
        const cost = s.base * (1 + (server - 1) * 0.35) * (fb.code === "US" ? 1.15 : 1);
        const m = (markups[server] ?? 20) / 100;
        return {
          id: `fb-${s.slug}-${server}`,
          server,
          price: (cost * (1 + m)).toFixed(4),
          // Keep browseable seed stock so a wholesale outage never blanks the shop
          stock: 25,
          inStock: true,
          live: false,
          markupPercent: markups[server] ?? 20,
          networkLabel: "Catalog",
          quality: 0.45,
        };
      }),
    })),
    liveStock: false,
    slotMarkups: markups,
    rankingRule:
      "Auto ranks Primary/Backup/Extra by historical OTP success (server × country × service × network × price band); price is tie-break only. Only real wholesale rows are listed.",
    slotStatuses: {
      1: { status: "empty", liveRows: 0, message: "Catalog only — live stock unavailable." },
      2: { status: "empty", liveRows: 0, message: "Catalog only — live stock unavailable." },
      3: { status: "empty", liveRows: 0, message: "Catalog only — live stock unavailable." },
    },
  };
}

type ApiOffer = {
  id: string;
  server: number;
  price: string;
  stock: number;
  inStock: boolean;
  live: boolean;
  markupPercent: number;
  wholesale?: number;
  operator?: string;
  networkLabel?: string;
  providerRate?: number;
  quality?: number;
  successAttempts?: number;
  successHits?: number;
  maxPrice?: number;
};

function liveRowToOffer(
  seedId: string,
  server: number,
  slug: string,
  row: ProviderPriceRow & {
    quality?: number;
    successAttempts?: number;
    successHits?: number;
  },
  markup: number,
  index: number,
): ApiOffer | null {
  if (!isPlausibleMarkedUpOtp(row.wholesale, markup)) return null;
  const retail = retailFromWholesale(row.wholesale, markup);
  const stock = row.stock ?? (row.available ? 1 : 0);
  const op = row.operator ?? "";
  return {
    id: `${seedId}:live:${op || index}:${row.wholesale.toFixed(4)}`,
    server,
    price: decimalJson(new Prisma.Decimal(retail.toFixed(4))),
    stock,
    inStock: stock > 0 && row.available !== false,
    live: true,
    markupPercent: markup,
    wholesale: Number(row.wholesale.toFixed?.(4) ?? row.wholesale),
    operator: row.operator,
    networkLabel: row.networkLabel ?? row.operator ?? "Network",
    providerRate: row.providerRate,
    quality: row.quality,
    successAttempts: row.successAttempts,
    successHits: row.successHits,
    maxPrice: row.maxPrice ?? row.wholesale,
  };
}

/** Overlay seed offers with live multi-operator / multi-price rows, ranked by success. */
function expandOffersForService(
  seedOffers: { id: string; server: number; price: Prisma.Decimal | string; stock: number }[],
  slug: string,
  liveBySlot: Map<number, SlotLiveStock>,
  markups: Record<number, number>,
  stats: Awaited<ReturnType<typeof loadSuccessStatMap>>,
  wantLive: boolean,
): ApiOffer[] {
  const out: ApiOffer[] = [];

  for (const seed of seedOffers) {
    const markup = markups[seed.server] ?? DEFAULT_SLOT_MARKUP;
    if (!wantLive) {
      out.push({
        id: seed.id,
        server: seed.server,
        price: decimalJson(seed.price),
        stock: seed.stock,
        inStock: seed.stock > 0,
        live: false,
        markupPercent: markup,
        networkLabel: "Catalog",
        quality: 0.45,
      });
      continue;
    }

    const slotLive = liveBySlot.get(seed.server);
    const liveList = slotLive?.offersBySlug.get(slug) ?? [];
    if (liveList.length > 0) {
      const ranked = rankProviderRows(liveList, seed.server, stats).slice(
        0,
        MAX_OFFERS_PER_SERVICE,
      );
      ranked.forEach((row, i) => {
        const offer = liveRowToOffer(seed.id, seed.server, slug, row, markup, i);
        if (offer) out.push(offer);
      });
      continue;
    }

    // No live multi rows — keep catalog seed so other tabs / browse still work
    const seedStock = Math.max(0, Number(seed.stock) || 0);
    out.push({
      id: seed.id,
      server: seed.server,
      price: decimalJson(seed.price),
      stock: seedStock,
      inStock: seedStock > 0,
      live: false,
      markupPercent: markup,
      networkLabel: "Catalog",
      quality: 0.45,
    });
  }

  // Auto / cross-server: already have per-server rows. Sort within each server already done.
  return out;
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`services:${user.id}`);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const countryCode = (req.nextUrl.searchParams.get("country") ?? "US").toUpperCase();
  const q = req.nextUrl.searchParams.get("q")?.toLowerCase() ?? "";
  // live=1 overlays each Admin slot's wholesale × markup; default fast path skips wholesale
  const wantLive = req.nextUrl.searchParams.get("live") === "1";

  const markups = await slotMarkupMap();

  try {
    void ensureCatalogSeeded().catch(() => undefined);
    void ensureCountryOffers(countryCode).catch(() => undefined);

    const country = await prisma.country.findUnique({ where: { code: countryCode } });
    if (!country) {
      return Response.json(
        { ...synthServices(countryCode, q, markups), liveStock: false },
        {
          headers: {
            ...(rateLimitHeaders(rl) as Record<string, string>),
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const services = await prisma.service.findMany({
      where: { enabled: true },
      include: {
        offers: {
          where: { countryId: country.id, enabled: true },
          orderBy: { server: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const have = new Set(services.map((s) => s.slug));
    const extras = FALLBACK_SERVICES.filter((def) => !have.has(def.slug)).map((def) => ({
      id: `fallback-${def.slug}`,
      slug: def.slug,
      name: def.name,
      category: def.category,
      offers: [1, 2, 3].map((server) => {
        const cost =
          def.base * (1 + (server - 1) * 0.35) * (country.code === "US" ? 1.15 : 1);
        const m = (markups[server] ?? 20) / 100;
        return {
          id: `fb-${def.slug}-${server}`,
          server,
          price: new Prisma.Decimal((cost * (1 + m)).toFixed(4)),
          // Browseable seed — never leave Extra/Backup blank when live wholesale is down
          stock: 25,
        };
      }),
    }));

    type Row = {
      id: string;
      slug: string;
      name: string;
      category: string | null;
      offers: { id: string; server: number; price: Prisma.Decimal | string; stock: number }[];
    };

    const rows: Row[] = [
      ...services.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        category: s.category,
        offers: s.offers,
      })),
      ...extras,
    ].filter(
      (s) =>
        !q || s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q),
    );

    let liveBySlot = new Map<number, SlotLiveStock>();
    if (wantLive) {
      // Isolate: live wholesale must never 504 / empty the catalog
      liveBySlot = await fetchLiveStockBySlot(countryCode).catch(() => new Map());
    }

    const stats = wantLive
      ? await loadSuccessStatMap().catch(() => new Map())
      : new Map();

    const liveCount = [...liveBySlot.values()].reduce(
      (n, s) => n + [...s.offersBySlug.values()].reduce((a, list) => a + list.length, 0),
      0,
    );

    const slotStatuses: Record<
      string,
      { status: string; liveRows: number; enabled?: boolean; message: string }
    > = {};
    for (const n of [1, 2, 3] as const) {
      const entry = liveBySlot.get(n);
      const offerCount = entry
        ? [...entry.offersBySlug.values()].reduce((a, list) => a + list.length, 0)
        : 0;
      slotStatuses[String(n)] = {
        status: entry?.status ?? (wantLive ? "empty" : "catalog"),
        liveRows: offerCount,
        enabled: entry?.enabled,
        message: wantLive
          ? slotCustomerMessage(entry)
          : "Catalog prices — switch to live stock when available.",
      };
    }

    return Response.json(
      {
        country: {
          id: country.id,
          code: country.code,
          name: country.name,
          flag: country.flag,
        },
        services: rows.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          category: s.category,
          offers: expandOffersForService(
            s.offers,
            s.slug,
            liveBySlot,
            markups,
            stats,
            wantLive,
          ),
        })),
        liveStock: liveCount > 0,
        slotMarkups: markups,
        rankingRule:
          "Auto ranks Primary/Backup/Extra by historical OTP success (server × country × service × network × wholesale price band; Laplace-smoothed). Tie-break: lower price — not cheapest-first. Provider delivery rate used only when shop history is empty. Only real wholesale offers — never invented stock.",
        // Never send wholesale providerType to the customer browser
        slotProviders: Object.fromEntries(
          [...liveBySlot.entries()].map(([k, v]) => [
            k,
            {
              liveRows: [...v.offersBySlug.values()].reduce((a, list) => a + list.length, 0),
            },
          ]),
        ),
        slotStatuses,
      },
      {
        headers: {
          ...(rateLimitHeaders(rl) as Record<string, string>),
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    console.error("[services]", err instanceof Error ? err.message : err);
    // Never blank the shop — synth catalog keeps Primary/Backup/Extra browseable
    return Response.json(synthServices(countryCode, q, markups), {
      headers: rateLimitHeaders(rl),
    });
  }
}
