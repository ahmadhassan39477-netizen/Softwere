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
import { createFiveSimAdapter } from "@/lib/sms/adapters/fivesim";
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
        // Distinct placeholders only — never identical across servers
        const cost = s.base * (1 + (server - 1) * 0.35) * (fb.code === "US" ? 1.15 : 1);
        const m = (markups[server] ?? 20) / 100;
        return {
          id: `fb-${s.slug}-${server}`,
          server,
          price: (cost * (1 + m)).toFixed(4),
          stock: 0,
          inStock: false,
          live: false,
          markupPercent: markups[server] ?? 20,
        };
      }),
    })),
    liveStock: false,
    slotMarkups: markups,
  };
}

/** Overlay one offer with that server slot's live wholesale × markup. */
function applySlotLive(
  offer: { id: string; server: number; price: Prisma.Decimal | string; stock: number },
  slug: string,
  liveBySlot: Map<number, SlotLiveStock>,
  markups: Record<number, number>,
) {
  const slotLive = liveBySlot.get(offer.server);
  const liveRow = slotLive?.bySlug.get(slug);
  const markup = markups[offer.server] ?? DEFAULT_SLOT_MARKUP;

  if (liveRow && liveRow.wholesale > 0) {
    const retail = retailFromWholesale(liveRow.wholesale, markup);
    const stock = liveRow.stock ?? (liveRow.available ? Math.max(offer.stock, 1) : 0);
    return {
      id: offer.id,
      server: offer.server,
      price: decimalJson(new Prisma.Decimal(retail.toFixed(4))),
      stock,
      inStock: stock > 0 && liveRow.available !== false,
      live: true,
      markupPercent: markup,
      wholesale: Number(liveRow.wholesale.toFixed?.(4) ?? liveRow.wholesale),
    };
  }

  // No live row for this slot — do not pretend seed prices are this provider's tariff
  return {
    id: offer.id,
    server: offer.server,
    price: decimalJson(offer.price),
    stock: offer.stock,
    inStock: offer.stock > 0,
    live: false,
    markupPercent: markup,
  };
}

/**
 * 5SIM guest product list needs no Admin key (public). Used only when Server slot
 * is typed 5SIM but the Admin key is empty — still never logs secrets.
 */
async function fillFiveSimGuestIfNeeded(
  countryCode: string,
  liveBySlot: Map<number, SlotLiveStock>,
): Promise<void> {
  for (const [slotNum, entry] of liveBySlot) {
    if (entry.providerType !== "5sim") continue;
    if (entry.bySlug.size > 0) continue;
    try {
      const adapter = createFiveSimAdapter("guest");
      if (!adapter.getPrices) continue;
      const rows = await Promise.race([
        adapter.getPrices(countryCode),
        new Promise<Awaited<ReturnType<NonNullable<typeof adapter.getPrices>>>>((resolve) =>
          setTimeout(() => resolve([]), 2500),
        ),
      ]);
      const bySlug = new Map(rows.map((r) => [r.serviceSlug, r]));
      liveBySlot.set(slotNum, { ...entry, bySlug });
    } catch {
      /* ignore */
    }
  }
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
          stock: 0,
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
      liveBySlot = await fetchLiveStockBySlot(countryCode);
      await fillFiveSimGuestIfNeeded(countryCode, liveBySlot);
    }

    const liveCount = [...liveBySlot.values()].reduce((n, s) => n + s.bySlug.size, 0);

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
          offers: s.offers.map((o) =>
            wantLive
              ? applySlotLive(o, s.slug, liveBySlot, markups)
              : {
                  id: o.id,
                  server: o.server,
                  price: decimalJson(o.price),
                  stock: o.stock,
                  inStock: o.stock > 0,
                  live: false,
                  markupPercent: markups[o.server] ?? 20,
                },
          ),
        })),
        liveStock: liveCount > 0,
        slotMarkups: markups,
        slotProviders: Object.fromEntries(
          [...liveBySlot.entries()].map(([k, v]) => [
            k,
            { providerType: v.providerType, liveRows: v.bySlug.size },
          ]),
        ),
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
