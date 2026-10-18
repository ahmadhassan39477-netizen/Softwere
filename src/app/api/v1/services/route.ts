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
        };
      }),
    })),
    liveStock: false,
    slotMarkups: markups,
    slotStatuses: {
      1: { status: "empty", liveRows: 0, message: "Catalog only — live stock unavailable." },
      2: { status: "empty", liveRows: 0, message: "Catalog only — live stock unavailable." },
      3: { status: "empty", liveRows: 0, message: "Catalog only — live stock unavailable." },
    },
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

  // No live row — keep catalog seed so other tabs / browse still work
  const seedStock = Math.max(0, Number(offer.stock) || 0);
  return {
    id: offer.id,
    server: offer.server,
    price: decimalJson(offer.price),
    stock: seedStock,
    inStock: seedStock > 0,
    live: false,
    markupPercent: markup,
  };
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

    const liveCount = [...liveBySlot.values()].reduce((n, s) => n + s.bySlug.size, 0);

    const slotStatuses: Record<
      string,
      { status: string; liveRows: number; enabled?: boolean; message: string }
    > = {};
    for (const n of [1, 2, 3] as const) {
      const entry = liveBySlot.get(n);
      slotStatuses[String(n)] = {
        status: entry?.status ?? (wantLive ? "empty" : "catalog"),
        liveRows: entry?.bySlug.size ?? 0,
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
        // Never send wholesale providerType to the customer browser
        slotProviders: Object.fromEntries(
          [...liveBySlot.entries()].map(([k, v]) => [
            k,
            { liveRows: v.bySlug.size },
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
