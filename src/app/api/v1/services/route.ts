import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { decimalJson } from "@/lib/money";
import { ensureCatalogSeeded, ensureCountryOffers } from "@/lib/ensure-catalog";
import { FALLBACK_SERVICES } from "@/lib/catalog-fallback";
import { worldCountryByCode } from "@/lib/world-countries";
import { fetchFiveSimLiveStock } from "@/lib/sms/live-stock";
import {
  DEFAULT_SLOT_MARKUP,
  loadProviderSlots,
  retailFromWholesale,
} from "@/lib/sms/provider-slots";

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
        const cost = s.base * (1 + (server - 1) * 0.08) * (fb.code === "US" ? 1.15 : 1);
        const m = (markups[server] ?? 20) / 100;
        return {
          id: `fb-${s.slug}-${server}`,
          server,
          price: (cost * (1 + m)).toFixed(4),
          stock: 40,
          inStock: true,
        };
      }),
    })),
  };
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`services:${user.id}`);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const countryCode = (req.nextUrl.searchParams.get("country") ?? "US").toUpperCase();
  const q = req.nextUrl.searchParams.get("q")?.toLowerCase() ?? "";
  // live=1 overlays 5SIM; default fast path never blocks first paint on wholesale
  const wantLive = req.nextUrl.searchParams.get("live") === "1";

  const markups = await slotMarkupMap();

  try {
    // Seed / offer expand in background — never block country switch first paint
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
          def.base * (1 + (server - 1) * 0.08) * (country.code === "US" ? 1.15 : 1);
        const m = (markups[server] ?? 20) / 100;
        return {
          id: `fb-${def.slug}-${server}`,
          server,
          price: new Prisma.Decimal((cost * (1 + m)).toFixed(4)),
          stock: 40,
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

    // Live 5SIM only when requested — never blocks the fast catalog paint
    const live = wantLive ? await fetchFiveSimLiveStock(countryCode) : new Map();
    // Which slots currently use 5SIM (for live overlay)
    const fiveSimSlots = new Set(
      (await loadProviderSlots().catch(() => [])).filter((s) => s.providerType === "5sim").map((s) => s.priority),
    );

    return Response.json(
      {
        country: {
          id: country.id,
          code: country.code,
          name: country.name,
          flag: country.flag,
        },
        services: rows.map((s) => {
          const liveRow = live.get(s.slug);
          return {
            id: s.id,
            slug: s.slug,
            name: s.name,
            category: s.category,
            offers: s.offers.map((o) => {
              let stock = o.stock;
              let price = o.price;
              const slotM = (markups[o.server] ?? 20) / 100;
              if (liveRow && (fiveSimSlots.has(o.server) || o.server === 2)) {
                stock = liveRow.stock ?? (liveRow.available ? Math.max(stock, 1) : 0);
                if (liveRow.wholesale > 0) {
                  price = new Prisma.Decimal(
                    retailFromWholesale(liveRow.wholesale, markups[o.server] ?? 20).toFixed(4),
                  );
                }
              } else if (typeof price === "string" || price instanceof Prisma.Decimal) {
                // leave seeded offer price; Grizzly/slot markup applied on buy from wholesale
                void slotM;
              }
              return {
                id: o.id,
                server: o.server,
                price: decimalJson(price),
                stock,
                inStock: stock > 0,
                live: Boolean(liveRow) && (fiveSimSlots.has(o.server) || o.server === 2),
                markupPercent: markups[o.server] ?? 20,
              };
            }),
          };
        }),
        liveStock: live.size > 0,
        slotMarkups: markups,
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
    return Response.json(synthServices(countryCode, q, markups), {
      headers: rateLimitHeaders(rl),
    });
  }
}
