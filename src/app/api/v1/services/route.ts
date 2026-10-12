import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { decimalJson } from "@/lib/money";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`services:${user.id}`);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const countryCode = req.nextUrl.searchParams.get("country")?.toUpperCase();
  const q = req.nextUrl.searchParams.get("q")?.toLowerCase() ?? "";

  const country = countryCode
    ? await prisma.country.findUnique({ where: { code: countryCode } })
    : await prisma.country.findFirst({ where: { enabled: true }, orderBy: { sortOrder: "asc" } });

  if (!country) return jsonError("Country not found", 404);

  const services = await prisma.service.findMany({
    where: {
      enabled: true,
      ...(q
        ? {
            OR: [{ name: { contains: q } }, { slug: { contains: q } }],
          }
        : {}),
    },
    include: {
      offers: {
        where: { countryId: country.id, enabled: true },
        orderBy: { server: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

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
}
