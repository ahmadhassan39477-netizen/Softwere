import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { ensureCatalogSeeded } from "@/lib/ensure-catalog";
import { filterWorldCountries, WORLD_COUNTRIES } from "@/lib/world-countries";

/**
 * Always returns the full world country list (never 8–10).
 * Availability overlays from Neon when present; search filters the full list.
 */
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`countries:${user.id}`);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const q = req.nextUrl.searchParams.get("q") ?? "";

  // Expand Neon in background — response does not wait on full seed
  void ensureCatalogSeeded().catch((err) =>
    console.error("[countries] seed", err instanceof Error ? err.message : err),
  );

  let availability = new Map<string, number>();
  try {
    const rows = await prisma.country.findMany({
      where: { enabled: true },
      select: { code: true, availability: true, id: true },
    });
    availability = new Map(rows.map((r) => [r.code, r.availability]));
  } catch {
    /* Neon may be cold — static list still returned */
  }

  const list = filterWorldCountries(q).map((c) => ({
    id: `world-${c.code}`,
    code: c.code,
    name: c.name,
    flag: c.flag,
    dialCode: c.dialCode,
    availability: availability.get(c.code) ?? c.availability,
  }));

  return Response.json(
    {
      countries: list,
      total: WORLD_COUNTRIES.length,
      filtered: list.length,
    },
    { headers: rateLimitHeaders(rl) },
  );
}
