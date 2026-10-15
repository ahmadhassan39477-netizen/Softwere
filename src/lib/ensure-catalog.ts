import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FALLBACK_SERVICES } from "@/lib/catalog-fallback";
import { WORLD_COUNTRIES } from "@/lib/world-countries";

const CATALOG_VERSION = "world_v3";
let seeding: Promise<void> | null = null;
const countryOfferLocks = new Map<string, Promise<void>>();

function markupRatio() {
  return Number(process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20") / 100;
}

/**
 * Expand Neon to the full world country list + broad services.
 * Safe to call often — skips when Setting world_catalog_version matches.
 */
export async function ensureCatalogSeeded(): Promise<void> {
  if (seeding) return seeding;

  seeding = (async () => {
    try {
      const ver = await prisma.setting.findUnique({
        where: { key: "world_catalog_version" },
      });
      const countryCount = await prisma.country.count();
      // Re-run if version stale OR Neon still has the short 8–10 list
      if (ver?.value === CATALOG_VERSION && countryCount >= WORLD_COUNTRIES.length - 5) {
        return;
      }

      console.info(
        `[catalog] expanding world catalog (countries=${countryCount} → ${WORLD_COUNTRIES.length})`,
      );

      for (let i = 0; i < WORLD_COUNTRIES.length; i++) {
        const c = WORLD_COUNTRIES[i];
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

      // Seed offers for a popular core set immediately so first paint has prices;
      // other countries get offers lazily via ensureCountryOffers.
      const coreCodes = new Set([
        "US", "GB", "NG", "IN", "DE", "FR", "BR", "ID", "PH", "RU",
        "CA", "AU", "MX", "ZA", "KE", "PK", "BD", "TR", "UA", "PL",
        "ES", "IT", "NL", "SE", "AE", "SA", "EG", "JP", "KR", "TH",
      ]);
      const countries = await prisma.country.findMany({
        where: { code: { in: [...coreCodes] } },
      });
      const services = await prisma.service.findMany();
      const markup = markupRatio();

      for (const country of countries) {
        for (let si = 0; si < FALLBACK_SERVICES.length; si++) {
          const def = FALLBACK_SERVICES[si];
          const svc = services.find((x) => x.slug === def.slug);
          if (!svc) continue;
          for (const server of [1, 2, 3]) {
            const cost =
              def.base * (1 + (server - 1) * 0.08) * (country.code === "US" ? 1.15 : 1);
            const price = cost * (1 + markup);
            const stock = 40 + ((si + server + country.sortOrder) % 90);
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
                enabled: true,
              },
            });
          }
        }
      }

      const { ensureProviderSlots } = await import("@/lib/sms/provider-slots");
      await ensureProviderSlots().catch(() => undefined);

      await prisma.providerConfig.upsert({
        where: { key: "mock" },
        create: { key: "mock", name: "Mock SMS Provider", enabled: true },
        update: { enabled: true },
      });

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
      await prisma.setting.upsert({
        where: { key: "world_catalog_version" },
        create: { key: "world_catalog_version", value: CATALOG_VERSION },
        update: { value: CATALOG_VERSION },
      });

      console.info("[catalog] world catalog expand complete");
    } catch (err) {
      console.error(
        "[catalog] ensureCatalogSeeded failed",
        err instanceof Error ? err.message : err,
      );
      seeding = null;
      throw err;
    }
  })();

  return seeding;
}

/** Lazy-create price/stock rows for one country so buy works for any ISO code. */
export async function ensureCountryOffers(countryCode: string): Promise<void> {
  const code = countryCode.toUpperCase();
  const existing = countryOfferLocks.get(code);
  if (existing) return existing;

  const job = (async () => {
    await ensureCatalogSeeded().catch(() => undefined);
    const country = await prisma.country.findUnique({ where: { code } });
    if (!country) return;

    const offerCount = await prisma.serviceOffer.count({
      where: { countryId: country.id },
    });
    if (offerCount >= FALLBACK_SERVICES.length) return;

    const services = await prisma.service.findMany();
    const markup = markupRatio();
    for (let si = 0; si < FALLBACK_SERVICES.length; si++) {
      const def = FALLBACK_SERVICES[si];
      const svc = services.find((x) => x.slug === def.slug);
      if (!svc) continue;
      for (const server of [1, 2, 3]) {
        const cost = def.base * (1 + (server - 1) * 0.08) * (code === "US" ? 1.15 : 1);
        const price = cost * (1 + markup);
        const stock = 35 + ((si + server + country.sortOrder) % 80);
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
          update: { enabled: true },
        });
      }
    }
  })().finally(() => {
    countryOfferLocks.delete(code);
  });

  countryOfferLocks.set(code, job);
  return job;
}
