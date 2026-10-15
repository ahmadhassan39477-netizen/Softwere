import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { decimalJson } from "@/lib/money";
import { ensureCatalogSeeded, ensureCountryOffers } from "@/lib/ensure-catalog";
import { FALLBACK_SERVICES } from "@/lib/catalog-fallback";
import { worldCountryByCode } from "@/lib/world-countries";

function synthServices(countryCode: string, q: string) {
  const fb = worldCountryByCode(countryCode) ?? worldCountryByCode("US")!;
  const markup = Number(process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20") / 100;
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
        return {
          id: `fb-${s.slug}-${server}`,
          server,
          price: (cost * (1 + markup)).toFixed(4),
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

  try {
    await ensureCatalogSeeded().catch(() => undefined);
    await ensureCountryOffers(countryCode).catch(() => undefined);

    const country = await prisma.country.findUnique({ where: { code: countryCode } });
    if (!country) {
      return Response.json(synthServices(countryCode, q), {
        headers: rateLimitHeaders(rl),
      });
    }

    let services = await prisma.service.findMany({
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
    const markup = Number(process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20") / 100;
    const extras = FALLBACK_SERVICES.filter((def) => !have.has(def.slug)).map((def) => ({
      id: `fallback-${def.slug}`,
      slug: def.slug,
      name: def.name,
      category: def.category,
      offers: [1, 2, 3].map((server) => {
        const cost =
          def.base * (1 + (server - 1) * 0.08) * (country.code === "US" ? 1.15 : 1);
        return {
          id: `fb-${def.slug}-${server}`,
          server,
          price: new Prisma.Decimal((cost * (1 + markup)).toFixed(4)),
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

    let rows: Row[] = [
      ...services.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        category: s.category,
        offers: s.offers,
      })),
      ...extras,
    ];

    if (q) {
      rows = rows.filter(
        (s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q),
      );
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
          offers: s.offers.map((o) => ({
            id: o.id,
            server: o.server,
            price: decimalJson(o.price),
            stock: o.stock,
            inStock: o.stock > 0,
          })),
        })),
      },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    console.error("[services]", err instanceof Error ? err.message : err);
    return Response.json(synthServices(countryCode, q), {
      headers: rateLimitHeaders(rl),
    });
  }
}
