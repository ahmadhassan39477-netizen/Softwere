import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { ensureCatalogSeeded } from "@/lib/ensure-catalog";
import { ensureServiceCountryCatalog } from "@/lib/sms/ensure-service-catalog";
import { decimalJson } from "@/lib/money";
import { FALLBACK_COUNTRIES, FALLBACK_SERVICES } from "@/lib/catalog-fallback";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  await ensureCatalogSeeded().catch(() => undefined);
  await ensureServiceCountryCatalog().catch(() => undefined);

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const country = req.nextUrl.searchParams.get("country")?.trim().toUpperCase();
  const service = req.nextUrl.searchParams.get("service")?.trim().toLowerCase();

  let rows = await prisma.serviceCountryCatalog.findMany({
    where: {
      enabled: true,
      ...(country ? { countryCode: country } : {}),
      ...(service ? { serviceSlug: service } : {}),
    },
    orderBy: [{ countryName: "asc" }, { serviceName: "asc" }],
    take: 500,
  });

  if (rows.length === 0) {
    const markup = Number(process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20") / 100;
    rows = FALLBACK_COUNTRIES.flatMap((c) =>
      FALLBACK_SERVICES.map((s) => ({
        id: `${c.code}-${s.slug}`,
        countryCode: c.code,
        serviceSlug: s.slug,
        countryName: c.name,
        serviceName: s.name,
        flag: c.flag,
        retailPrice: new Prisma.Decimal((s.base * (1 + markup)).toFixed(4)),
        wholesaleHint: new Prisma.Decimal(s.base.toFixed(4)),
        server1Stock: 50,
        server2Stock: 40,
        server3Stock: 30,
        enabled: true,
        updatedAt: new Date(),
      })),
    );
  }

  const filtered = q
    ? rows.filter(
        (r) =>
          r.countryName.toLowerCase().includes(q) ||
          r.countryCode.toLowerCase().includes(q) ||
          r.serviceName.toLowerCase().includes(q) ||
          r.serviceSlug.toLowerCase().includes(q),
      )
    : rows;

  const countries = Array.from(
    new Map(
      filtered.map((r) => [
        r.countryCode,
        { code: r.countryCode, name: r.countryName, flag: r.flag },
      ]),
    ).values(),
  );

  const services = Array.from(
    new Map(
      filtered.map((r) => [r.serviceSlug, { slug: r.serviceSlug, name: r.serviceName }]),
    ).values(),
  );

  return Response.json({
    items: filtered.map((r) => ({
      countryCode: r.countryCode,
      countryName: r.countryName,
      flag: r.flag,
      serviceSlug: r.serviceSlug,
      serviceName: r.serviceName,
      retailPrice: decimalJson(r.retailPrice),
      stocks: {
        1: r.server1Stock,
        2: r.server2Stock,
        3: r.server3Stock,
      },
      inStock: r.server1Stock + r.server2Stock + r.server3Stock > 0,
    })),
    countries,
    services,
  });
}
