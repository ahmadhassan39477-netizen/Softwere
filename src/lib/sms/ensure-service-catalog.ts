import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FALLBACK_COUNTRIES, FALLBACK_SERVICES } from "@/lib/catalog-fallback";
import { ensureProviderSlots } from "@/lib/sms/provider-slots";

let seeding: Promise<void> | null = null;

/** Upsert ProviderSetting server slots + ServiceCountryCatalog from Country/Service/Offer or fallbacks. */
export async function ensureServiceCountryCatalog(): Promise<void> {
  if (seeding) return seeding;

  seeding = (async () => {
    try {
      await ensureProviderSlots();

      await prisma.setting.upsert({
        where: { key: "global_markup_percent" },
        create: {
          key: "global_markup_percent",
          value: process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20",
        },
        update: {},
      });
      await prisma.setting.upsert({
        where: { key: "order_ttl_minutes" },
        create: { key: "order_ttl_minutes", value: "5" },
        update: { value: "5" },
      });
      await prisma.setting.upsert({
        where: { key: "cancel_window_seconds" },
        create: { key: "cancel_window_seconds", value: "300" },
        update: { value: "300" },
      });

      const count = await prisma.serviceCountryCatalog.count();
      if (count > 0) return;

      const countries = await prisma.country.findMany({ where: { enabled: true } });
      const services = await prisma.service.findMany({ where: { enabled: true } });
      const offers = await prisma.serviceOffer.findMany({ where: { enabled: true } });

      const countryList =
        countries.length > 0
          ? countries
          : FALLBACK_COUNTRIES.map((c) => ({
              id: c.code,
              code: c.code,
              name: c.name,
              flag: c.flag,
            }));
      const serviceList =
        services.length > 0
          ? services
          : FALLBACK_SERVICES.map((s) => ({
              id: s.slug,
              slug: s.slug,
              name: s.name,
            }));

      for (const country of countryList) {
        for (const svc of serviceList) {
          const countryOffers = offers.filter(
            (o) =>
              ("countryId" in country ? o.countryId === (country as { id: string }).id : false) &&
              ("id" in svc && services.length > 0
                ? o.serviceId === (svc as { id: string }).id
                : false),
          );
          const o1 = countryOffers.find((o) => o.server === 1);
          const o2 = countryOffers.find((o) => o.server === 2);
          const o3 = countryOffers.find((o) => o.server === 3);
          const fallback = FALLBACK_SERVICES.find((s) => s.slug === svc.slug);
          const base = fallback?.base ?? 0.4;
          const markup = Number(process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20") / 100;
          const retail = o1
            ? Number(o1.price)
            : Number((base * (1 + markup)).toFixed(4));

          await prisma.serviceCountryCatalog.upsert({
            where: {
              countryCode_serviceSlug: {
                countryCode: country.code,
                serviceSlug: svc.slug,
              },
            },
            create: {
              countryCode: country.code,
              serviceSlug: svc.slug,
              countryName: country.name,
              serviceName: svc.name,
              flag: "flag" in country ? String(country.flag) : "",
              retailPrice: new Prisma.Decimal(retail.toFixed(4)),
              wholesaleHint: new Prisma.Decimal(
                o1 ? Number(o1.costPrice).toFixed(4) : base.toFixed(4),
              ),
              server1Stock: o1?.stock ?? 50,
              server2Stock: o2?.stock ?? 40,
              server3Stock: o3?.stock ?? 30,
              enabled: true,
            },
            update: {
              retailPrice: new Prisma.Decimal(retail.toFixed(4)),
              server1Stock: o1?.stock ?? 50,
              server2Stock: o2?.stock ?? 40,
              server3Stock: o3?.stock ?? 30,
              enabled: true,
            },
          });
        }
      }
    } catch (err) {
      console.error(
        "[catalog] ensureServiceCountryCatalog failed",
        err instanceof Error ? err.message : err,
      );
      seeding = null;
      throw err;
    }
  })();

  return seeding;
}
