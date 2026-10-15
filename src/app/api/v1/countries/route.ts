import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { ensureCatalogSeeded } from "@/lib/ensure-catalog";
import { filterFallbackCountries } from "@/lib/catalog-fallback";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`countries:${user.id}`);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const q = req.nextUrl.searchParams.get("q")?.toLowerCase() ?? "";

  try {
    await ensureCatalogSeeded();

    let countries = await prisma.country.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    if (q) {
      countries = countries.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.dialCode.includes(q),
      );
    }

    if (countries.length === 0 && !q) {
      // Still empty after seed attempt — static UI fallback
      const fallback = filterFallbackCountries("").map((c) => ({
        id: `fallback-${c.code}`,
        code: c.code,
        name: c.name,
        flag: c.flag,
        dialCode: c.dialCode,
        availability: c.availability,
      }));
      return Response.json({ countries: fallback }, { headers: rateLimitHeaders(rl) });
    }

    return Response.json(
      {
        countries: countries.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          flag: c.flag,
          dialCode: c.dialCode,
          availability: c.availability,
        })),
      },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    console.error("[countries]", err instanceof Error ? err.message : err);
    const countries = filterFallbackCountries(q).map((c) => ({
      id: `fallback-${c.code}`,
      code: c.code,
      name: c.name,
      flag: c.flag,
      dialCode: c.dialCode,
      availability: c.availability,
    }));
    return Response.json({ countries }, { headers: rateLimitHeaders(rl) });
  }
}
