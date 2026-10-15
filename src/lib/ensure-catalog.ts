import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FALLBACK_COUNTRIES, FALLBACK_SERVICES } from "@/lib/catalog-fallback";

let seeding: Promise<void> | null = null;

/**
 * If Country table is empty (fresh Neon), upsert the static catalog + mock offers
 * so the Buy UI and purchase flow work without wholesale API keys.
 */
export async function ensureCatalogSeeded(): Promise<void> {
  if (seeding) return seeding;

  seeding = (async () => {
    try {
      const count = await prisma.country.count();
      if (count > 0) return;

      console.info("[catalog] empty — seeding fallback countries/services/offers");

      for (let i = 0; i < FALLBACK_COUNTRIES.length; i++) {
        const c = FALLBACK_COUNTRIES[i];
        await prisma.country.upsert({
          where: { code: c.code },
          create: {
            code: c.code,
            name: c.name,
            flag: c.flag,
            dialCode: c.dialCode,
            availability: c.availability,
            sortOrder: c.sortOrder,
            enabled: true,
          },
          update: {
            name: c.name,
            flag: c.flag,
            dialCode: c.dialCode,
            availability: c.availability,
            sortOrder: c.sortOrder,
            enabled: true,
          },
        });
      }

      for (const s of FALLBACK_SERVICES) {
        await prisma.service.upsert({
          where: { slug: s.slug },
          create: {
            slug: s.slug,
            name: s.name,
            category: s.category,
            enabled: true,
          },
          update: {
            name: s.name,
            category: s.category,
            enabled: true,
          },
        });
      }

      const markup = Number(process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20") / 100;
      const countries = await prisma.country.findMany();
      const services = await prisma.service.findMany();

      for (const country of countries) {
        for (let si = 0; si < FALLBACK_SERVICES.length; si++) {
          const def = FALLBACK_SERVICES[si];
          const svc = services.find((x) => x.slug === def.slug);
          if (!svc) continue;
          for (const server of [1, 2, 3]) {
            const cost = def.base * (1 + (server - 1) * 0.08) * (country.code === "US" ? 1.15 : 1);
            const price = cost * (1 + markup);
            const stock = server === 3 && si % 5 === 0 ? 12 : 50 + ((si + server) % 7) * 12;
            await prisma.serviceOffer.upsert({
              where: {
                countryId_serviceId_server: {
                  countryId: country.id,
                  serviceId: svc.id,
                  server,
                },
              },
              create: {
                countryId: country.id,
                serviceId: svc.id,
                server,
                costPrice: new Prisma.Decimal(cost.toFixed(4)),
                price: new Prisma.Decimal(price.toFixed(4)),
                stock,
                enabled: true,
                providerKey: "mock",
              },
              update: {
                price: new Prisma.Decimal(price.toFixed(4)),
                stock,
                enabled: true,
                providerKey: "mock",
              },
            });
          }
        }
      }

      await prisma.providerConfig.upsert({
        where: { key: "mock" },
        create: { key: "mock", name: "Mock SMS Provider", enabled: true },
        update: { enabled: true },
      });

      for (const d of [
        { key: "sms-activate", name: "SMS-Activate", priority: 1 },
        { key: "5sim", name: "5SIM", priority: 2 },
        { key: "grizzlysms", name: "Grizzly SMS", priority: 3 },
      ]) {
        await prisma.providerSetting.upsert({
          where: { key: d.key },
          create: {
            key: d.key,
            name: d.name,
            priority: d.priority,
            enabled: true,
            markupPercent: new Prisma.Decimal(
              process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20",
            ),
          },
          update: {},
        });
      }

      await prisma.setting.upsert({
        where: { key: "order_ttl_minutes" },
        create: { key: "order_ttl_minutes", value: "15" },
        update: {},
      });
      await prisma.setting.upsert({
        where: { key: "cancel_window_seconds" },
        create: { key: "cancel_window_seconds", value: "120" },
        update: {},
      });
      await prisma.setting.upsert({
        where: { key: "global_markup_percent" },
        create: {
          key: "global_markup_percent",
          value: process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20",
        },
        update: {},
      });

      console.info("[catalog] fallback seed complete");
    } catch (err) {
      console.error("[catalog] ensureCatalogSeeded failed", err instanceof Error ? err.message : err);
      // allow retry on next request
      seeding = null;
      throw err;
    }
  })();

  return seeding;
}
