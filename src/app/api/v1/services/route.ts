import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { decimalJson } from "@/lib/money";
import { ensureCatalogSeeded } from "@/lib/ensure-catalog";
import { FALLBACK_COUNTRIES, FALLBACK_SERVICES } from "@/lib/catalog-fallback";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`services:${user.id}`);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const countryCode = req.nextUrl.searchParams.get("country")?.toUpperCase();
  const q = req.nextUrl.searchParams.get("q")?.toLowerCase() ?? "";

  try {
    await ensureCatalogSeeded();

    const country = countryCode
      ? await prisma.country.findUnique({ where: { code: countryCode } })
      : await prisma.country.findFirst({ where: { enabled: true }, orderBy: { sortOrder: "asc" } });

    if (!country) {
      const fb = FALLBACK_COUNTRIES.find((c) => c.code === (countryCode ?? "US")) ?? FALLBACK_COUNTRIES[0];
      return Response.json(
        {
          country: { id: `fallback-${fb.code}`, code: fb.code, name: fb.name, flag: fb.flag },
          services: FALLBACK_SERVICES.filter(
            (s) => !q || s.name.toLowerCase().includes(q) || s.slug.includes(q),
          ).map((s) => ({
            id: `fallback-${s.slug}`,
            slug: s.slug,
            name: s.name,
            category: s.category,
            offers: [1, 2, 3].map((server) => {
              const cost = s.base * (1 + (server - 1) * 0.08) * (fb.code === "US" ? 1.15 : 1);
              const price = (cost * 1.2).toFixed(4);
              return { id: `fb-${s.slug}-${server}`, server, price, stock: 40, inStock: true };
            }),
          })),
        },
        { headers: rateLimitHeaders(rl) },
      );
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

    if (q) {
      services = services.filter(
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
        services: services.map((s) => ({
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
    const fb =
      FALLBACK_COUNTRIES.find((c) => c.code === (countryCode ?? "US")) ?? FALLBACK_COUNTRIES[0];
    return Response.json(
      {
        country: { id: `fallback-${fb.code}`, code: fb.code, name: fb.name, flag: fb.flag },
        services: FALLBACK_SERVICES.filter(
          (s) => !q || s.name.toLowerCase().includes(q) || s.slug.includes(q),
        ).map((s) => ({
          id: `fallback-${s.slug}`,
          slug: s.slug,
          name: s.name,
          category: s.category,
          offers: [1, 2, 3].map((server) => ({
            id: `fb-${s.slug}-${server}`,
            server,
            price: (s.base * 1.2).toFixed(4),
            stock: 40,
            inStock: true,
          })),
        })),
      },
      { headers: rateLimitHeaders(rl) },
    );
  }
}
