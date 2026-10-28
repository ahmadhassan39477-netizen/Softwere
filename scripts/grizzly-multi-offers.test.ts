import assert from "node:assert/strict";
import { expandGrizzlyWebCountryRow } from "../src/lib/sms/adapters/grizzly-web-prices";
import { mergeGrizzlyPriceRows } from "../src/lib/sms/adapters/grizzlysms";
import {
  MAX_OFFERS_PER_SERVICE,
  qualityScore,
  rankProviderRows,
  successKey,
} from "../src/lib/sms/offer-success";
import type { ProviderPriceRow } from "../src/lib/sms/types";

// Fixture mirrors grizzlysms.com /api/country/get-prices/24 USA (virtual) prices[]
const usVirtualFb = {
  country_external_id: 12,
  price: "0.026",
  count: 12_000_000,
  prices: [
    {
      name: "provider0,provider1",
      providerId: "438,64",
      delivery: 55.18,
      quantity: 199488,
      value: 0.026,
    },
    {
      name: "provider2",
      providerId: "11",
      delivery: 54.16,
      quantity: 26610,
      value: 0.039,
    },
    {
      name: "provider3",
      providerId: "358",
      delivery: 33.75,
      quantity: 1652,
      value: 0.0625,
    },
    {
      name: "provider4",
      providerId: "161",
      delivery: 44.53,
      quantity: 10572,
      value: 0.14,
    },
    {
      name: "provider5",
      providerId: "4",
      delivery: 38.89,
      quantity: 59,
      value: 0.325,
    },
    {
      name: "provider6",
      providerId: "163",
      delivery: 100,
      quantity: 20,
      value: 0.52,
    },
    // zero stock — must not invent
    {
      name: "provider7",
      providerId: "999",
      delivery: 90,
      quantity: 0,
      value: 0.02,
    },
  ],
};

{
  const rows = expandGrizzlyWebCountryRow(usVirtualFb, {
    countryCode: "US",
    serviceSlug: "facebook",
  });
  assert.equal(rows.length, 6);
  assert.ok(rows.every((r) => (r.stock ?? 0) > 0));
  assert.ok(rows.every((r) => (r.maxPrice ?? 0) === r.wholesale));
  assert.equal(rows[0]!.operator, "438,64");
  assert.ok(rows[0]!.networkLabel?.includes("438"));
  assert.equal(rows[1]!.operator, "11");
  assert.ok((rows[1]!.providerRate ?? 0) > 50);
}

// GB WhatsApp multi tiers
{
  const rows = expandGrizzlyWebCountryRow(
    {
      country_external_id: 16,
      prices: [
        { providerId: "281,395", quantity: 100, value: 0.315, delivery: 15 },
        { providerId: "11", quantity: 50, value: 0.5, delivery: 8 },
        { providerId: "202", quantity: 20, value: 0.69, delivery: 5 },
      ],
    },
    { countryCode: "GB", serviceSlug: "whatsapp" },
  );
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.serviceSlug === "whatsapp"));
}

// Empty prices[] falls back to top-level cost/count only (still real stock)
{
  const rows = expandGrizzlyWebCountryRow(
    { country_external_id: 12, price: 0.15, count: 10, prices: [] },
    { countryCode: "US", serviceSlug: "whatsapp" },
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.networkLabel, "Any network");
}

// Merge: web wins per slug; SA fills missing services only
{
  const web: ProviderPriceRow[] = [
    {
      countryCode: "US",
      serviceSlug: "facebook",
      wholesale: 0.026,
      available: true,
      stock: 10,
      operator: "11",
    },
    {
      countryCode: "US",
      serviceSlug: "facebook",
      wholesale: 0.039,
      available: true,
      stock: 5,
      operator: "12",
    },
  ];
  const sa: ProviderPriceRow[] = [
    {
      countryCode: "US",
      serviceSlug: "facebook",
      wholesale: 0.026,
      available: true,
      stock: 999,
      networkLabel: "Any network",
    },
    {
      countryCode: "US",
      serviceSlug: "discord",
      wholesale: 0.2,
      available: true,
      stock: 3,
      networkLabel: "Any network",
    },
  ];
  const merged = mergeGrizzlyPriceRows(web, sa);
  assert.equal(merged.filter((r) => r.serviceSlug === "facebook").length, 2);
  assert.equal(merged.filter((r) => r.serviceSlug === "discord").length, 1);
}

// Rank by OTP success then price; cap 8 — US cheap high-success first
{
  const stats = new Map();
  const hi = {
    server: 2,
    countryCode: "US",
    serviceSlug: "facebook",
    operator: "438,64",
    priceBucket: "0.03",
    attempts: 35,
    successes: 28,
    quality: qualityScore({ attempts: 35, successes: 28 }),
  };
  stats.set(successKey(hi), hi);

  const many = expandGrizzlyWebCountryRow(
    {
      prices: Array.from({ length: 12 }, (_, i) => ({
        providerId: String(100 + i),
        quantity: 10,
        value: 0.05 + i * 0.02,
        delivery: 10,
      })),
    },
    { countryCode: "US", serviceSlug: "facebook" },
  );
  // Inject known high-success cheap tier
  many.push({
    countryCode: "US",
    serviceSlug: "facebook",
    wholesale: 0.026,
    available: true,
    stock: 100,
    operator: "438,64",
    providerRate: 55,
  });
  const ranked = rankProviderRows(many, 2, stats).slice(0, MAX_OFFERS_PER_SERVICE);
  assert.equal(ranked.length, MAX_OFFERS_PER_SERVICE);
  assert.equal(ranked[0]!.operator, "438,64");
  assert.ok(ranked[0]!.quality > 0.7);
  // 20% markup check on wholesale
  assert.ok(Math.abs(ranked[0]!.wholesale * 1.2 - 0.0312) < 0.0001);
}

console.log("grizzly-multi-offers.test.ts: ok");
