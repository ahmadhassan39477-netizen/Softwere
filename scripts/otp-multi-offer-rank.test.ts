import assert from "node:assert/strict";
import { extractSaMultiOffers } from "../src/lib/sms/sa-multi-prices";
import {
  isPlausibleMarkedUpOtp,
  isPlausibleOtpWholesale,
  MAX_PLAUSIBLE_OTP_RETAIL_USD,
} from "../src/lib/sms/otp-price-guards";
import {
  lookupQuality,
  priceBucket,
  qualityScore,
  rankProviderRows,
  successKey,
  wholesaleFromRetail,
} from "../src/lib/sms/offer-success";
import type { ProviderPriceRow } from "../src/lib/sms/types";

const slugByCode = new Map([
  ["fb", "facebook"],
  ["go", "google"],
]);

function ctx(country = "16") {
  return { countryCode: "GB", countryId: country, slugByCode };
}

// Classic single cell
{
  const rows = extractSaMultiOffers(
    { "16": { fb: { cost: 0.072, count: 40 } } },
    ctx(),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.serviceSlug, "facebook");
  assert.equal(rows[0]!.wholesale, 0.072);
}

// Price buckets (getPricesV2-style)
{
  const rows = extractSaMultiOffers(
    {
      "16": {
        fb: {
          "0.05": { count: 10 },
          "0.12": { count: 3 },
          "0.20": { count: 0 },
        },
      },
    },
    ctx(),
  );
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.operator?.startsWith("tier:")));
}

// Provider map (getPricesV3-style)
{
  const rows = extractSaMultiOffers(
    {
      "16": {
        fb: {
          providers: [
            { id: 12, name: "NetA", cost: 0.026, count: 100, rate: 90 },
            { id: 99, name: "NetB", cost: 0.08, count: 5, rate: 20 },
          ],
        },
      },
    },
    ctx(),
  );
  assert.equal(rows.length, 2);
  assert.equal(rows.find((r) => r.operator === "12")?.networkLabel, "NetA");
}

// Ranking: higher success first, then cheaper
{
  const stats = new Map();
  const usFbCheap = {
    server: 2,
    countryCode: "US",
    serviceSlug: "facebook",
    operator: "",
    priceBucket: "0.03",
    attempts: 26,
    successes: 25,
    quality: qualityScore({ attempts: 26, successes: 25 }),
  };
  const gbFbMid = {
    server: 2,
    countryCode: "GB",
    serviceSlug: "facebook",
    operator: "",
    priceBucket: "0.07",
    attempts: 30,
    successes: 8,
    quality: qualityScore({ attempts: 30, successes: 8 }),
  };
  stats.set(successKey(usFbCheap), usFbCheap);
  stats.set(successKey(gbFbMid), gbFbMid);

  const rows: ProviderPriceRow[] = [
    {
      countryCode: "GB",
      serviceSlug: "facebook",
      wholesale: 0.072,
      available: true,
      stock: 10,
      operator: "",
    },
    {
      countryCode: "US",
      serviceSlug: "facebook",
      wholesale: 0.026,
      available: true,
      stock: 10,
      operator: "",
    },
  ];
  // Rank within same country for a fair sort test
  const usOnly = rankProviderRows(
    [
      {
        countryCode: "US",
        serviceSlug: "facebook",
        wholesale: 0.08,
        available: true,
        stock: 5,
        operator: "b",
      },
      {
        countryCode: "US",
        serviceSlug: "facebook",
        wholesale: 0.026,
        available: true,
        stock: 5,
        operator: "",
      },
    ],
    2,
    stats,
  );
  assert.equal(usOnly[0]!.wholesale, 0.026);
  assert.ok(usOnly[0]!.quality > usOnly[1]!.quality);
  void rows;
}

assert.equal(priceBucket(0.072), "0.07");
assert.ok(Math.abs(wholesaleFromRetail(0.0312) - 0.026) < 0.0001);
assert.ok(qualityScore({ attempts: 26, successes: 25 }) > 0.9);

// Regression: SMSBower/V3 provider-id map must NOT become Tier $1015 USD
{
  const rows = extractSaMultiOffers(
    {
      "16": {
        fb: {
          "1015": { cost: 0.15, count: 40, name: "NetA", rate: 80 },
          "2260": { cost: 0.22, count: 12, name: "NetB", rate: 70 },
          "2266": { cost: 0.25, count: 5, name: "NetC", rate: 60 },
        },
      },
    },
    ctx(),
  );
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((r) => r.wholesale).sort((a, b) => a - b),
    [0.15, 0.22, 0.25],
  );
  assert.ok(rows.every((r) => !String(r.networkLabel ?? "").startsWith("Tier $")));
  assert.equal(rows.find((r) => r.operator === "1015")?.networkLabel, "NetA");
  // 1015*1.2=1218 was the live bug; cost*1.2 stays cents–dollars
  assert.ok(rows.every((r) => isPlausibleMarkedUpOtp(r.wholesale, 20)));
}

// True USD price buckets still work
{
  const rows = extractSaMultiOffers(
    {
      "16": {
        fb: {
          "0.05": { count: 10 },
          "1.20": { count: 3 },
        },
      },
    },
    ctx(),
  );
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.operator?.startsWith("tier:")));
}

// Absurd keys alone (provider ids without cost) must not become USD tiers
{
  const rows = extractSaMultiOffers(
    {
      "16": {
        fb: {
          "1015": { count: 40 },
          "2260": { count: 12 },
        },
      },
    },
    ctx(),
  );
  assert.equal(rows.length, 0);
}

assert.equal(isPlausibleOtpWholesale(1015), false);
assert.equal(isPlausibleOtpWholesale(0.15), true);
assert.equal(isPlausibleMarkedUpOtp(1015, 20), false);
assert.ok(MAX_PLAUSIBLE_OTP_RETAIL_USD <= 50);

// Ranking drops absurd wholesale even if a row slipped through
{
  const ranked = rankProviderRows(
    [
      {
        countryCode: "GB",
        serviceSlug: "facebook",
        wholesale: 1015,
        available: true,
        stock: 5,
        operator: "tier:1015.00",
      },
      {
        countryCode: "GB",
        serviceSlug: "facebook",
        wholesale: 0.15,
        available: true,
        stock: 5,
        operator: "1015",
      },
    ],
    3,
    new Map(),
  );
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0]!.wholesale, 0.15);
}

// Cross-server Auto: quality beats cheaper weak offer (S2 US high success vs S1 GB cheap weak)
{
  const stats = new Map();
  const s2Us = {
    server: 2,
    countryCode: "US",
    serviceSlug: "facebook",
    operator: "",
    priceBucket: "0.03",
    attempts: 35,
    successes: 28,
    quality: qualityScore({ attempts: 35, successes: 28 }),
  };
  const s1Gb = {
    server: 1,
    countryCode: "GB",
    serviceSlug: "facebook",
    operator: "",
    priceBucket: "0.15",
    attempts: 17,
    successes: 3,
    quality: qualityScore({ attempts: 17, successes: 3 }),
  };
  const s3Us = {
    server: 3,
    countryCode: "US",
    serviceSlug: "facebook",
    operator: "",
    priceBucket: "0.04",
    attempts: 4,
    successes: 1,
    quality: qualityScore({ attempts: 4, successes: 1 }),
  };
  stats.set(successKey(s2Us), s2Us);
  stats.set(successKey(s1Gb), s1Gb);
  stats.set(successKey(s3Us), s3Us);

  type Scored = { server: number; wholesale: number; quality: number };
  const candidates: Scored[] = [
    {
      server: 1,
      wholesale: 0.15,
      quality: lookupQuality(stats, {
        server: 1,
        countryCode: "GB",
        serviceSlug: "facebook",
        operator: "",
        priceBucket: "0.15",
      }).quality,
    },
    {
      server: 2,
      wholesale: 0.03,
      quality: lookupQuality(stats, {
        server: 2,
        countryCode: "US",
        serviceSlug: "facebook",
        operator: "",
        priceBucket: "0.03",
      }).quality,
    },
    {
      server: 3,
      wholesale: 0.02,
      quality: lookupQuality(stats, {
        server: 3,
        countryCode: "US",
        serviceSlug: "facebook",
        operator: "",
        priceBucket: "0.04",
      }).quality,
    },
  ];
  candidates.sort((a, b) => {
    if (b.quality !== a.quality) return b.quality - a.quality;
    return a.wholesale - b.wholesale;
  });
  // Cheapest is S3 ($0.02) but S2 quality wins Auto
  assert.equal(candidates[0]!.server, 2);
  assert.ok(candidates[0]!.quality > candidates[1]!.quality);
}

console.log("otp-multi-offer-rank.test.ts: ok");
