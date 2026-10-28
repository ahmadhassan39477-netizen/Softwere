/**
 * Customer Gmail catalog from SMSBower Server 3 mail API.
 * Retail = wholesale × 1.40. Never expose wholesale brand names.
 */

import { prisma } from "@/lib/prisma";
import { loadProviderSlots } from "@/lib/sms";
import {
  isStaleSmsBowerBaseUrl,
  resolveSmsBowerBaseUrl,
} from "@/lib/sms/adapters/smsbower";
import { loadSuccessStatMap, qualityScore, successKey, priceBucket } from "@/lib/sms/offer-success";
import { SA_SERVICE } from "@/lib/sms/service-map";
import {
  GMAIL_COUNTRY_CODE,
  GMAIL_DOMAIN,
  GMAIL_MARKUP_PERCENT,
  GMAIL_OPERATOR,
  getMailPriceRests,
  listMailServices,
  retailFromGmailWholesale,
  type MailServiceInfo,
} from "@/lib/smsbower-mail";

export { GMAIL_MARKUP_PERCENT, GMAIL_COUNTRY_CODE };

export type GmailOfferRow = {
  serviceSlug: string;
  serviceCode: string;
  serviceName: string;
  domain: string;
  wholesale: number;
  retail: number;
  stock: number;
  quality: number;
  successAttempts: number;
  successHits: number;
  maxPrice: number;
};

export type SmsBowerMailCreds = {
  apiKey: string;
  handlerBaseUrl: string;
  ready: boolean;
  reason?: string;
};

/** Resolve Server 3 SMSBower key for mail (same wallet as OTP Extra). */
export async function loadSmsBowerMailCreds(): Promise<SmsBowerMailCreds> {
  const slots = await loadProviderSlots();
  const slot = slots.find((s) => s.priority === 3);
  if (!slot) {
    return { apiKey: "", handlerBaseUrl: "", ready: false, reason: "no_slot" };
  }
  if (slot.providerType !== "smsbower") {
    return { apiKey: "", handlerBaseUrl: "", ready: false, reason: "not_smsbower" };
  }
  if (!slot.enabled) {
    return { apiKey: "", handlerBaseUrl: "", ready: false, reason: "disabled" };
  }
  const apiKey = slot.apiKey?.trim() || "";
  if (!apiKey) {
    return { apiKey: "", handlerBaseUrl: "", ready: false, reason: "no_key" };
  }
  let handlerBaseUrl = slot.baseUrl;
  if (isStaleSmsBowerBaseUrl(handlerBaseUrl)) handlerBaseUrl = null;
  return {
    apiKey,
    handlerBaseUrl: resolveSmsBowerBaseUrl(handlerBaseUrl),
    ready: true,
  };
}

/** Map SA mail service code → our catalog slug (best effort). */
function slugForMailCode(code: string, services: MailServiceInfo[]): string | null {
  const c = code.toLowerCase();
  for (const [slug, sa] of Object.entries(SA_SERVICE)) {
    if (sa.toLowerCase() === c) return slug;
  }
  const named = services.find((s) => s.code === c);
  if (named?.name) {
    const n = named.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    for (const [slug] of Object.entries(SA_SERVICE)) {
      if (slug.replace(/[^a-z0-9]+/g, "") === n) return slug;
    }
    if (n.includes("google") || n.includes("gmail")) return "google";
  }
  // Keep raw code as slug when unknown — still buyable
  return c.length >= 1 && c.length <= 32 ? c : null;
}

function displayNameFor(
  slug: string,
  code: string,
  services: MailServiceInfo[],
  dbName?: string | null,
): string {
  if (dbName?.trim()) return dbName.trim();
  const fromList = services.find((s) => s.code === code)?.name;
  if (fromList?.trim()) return fromList.trim();
  if (slug === "google") return "Google";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** Local/dev catalog when wholesale mail is not attached (never on production keys). */
function mockGmailOffers(): GmailOfferRow[] {
  const samples: Array<{ slug: string; name: string; wholesale: number; stock: number; quality: number }> = [
    { slug: "instagram", name: "Instagram", wholesale: 0.12, stock: 48, quality: 0.72 },
    { slug: "telegram", name: "Telegram", wholesale: 0.09, stock: 62, quality: 0.68 },
    { slug: "discord", name: "Discord", wholesale: 0.08, stock: 35, quality: 0.61 },
    { slug: "facebook", name: "Facebook", wholesale: 0.11, stock: 41, quality: 0.58 },
    { slug: "tiktok", name: "TikTok", wholesale: 0.14, stock: 22, quality: 0.55 },
    { slug: "twitter", name: "Twitter / X", wholesale: 0.13, stock: 19, quality: 0.52 },
    { slug: "google", name: "Google", wholesale: 0.16, stock: 27, quality: 0.49 },
    { slug: "openai", name: "OpenAI / ChatGPT", wholesale: 0.22, stock: 11, quality: 0.47 },
  ];
  return samples.map((s) => ({
    serviceSlug: s.slug,
    serviceCode: s.slug,
    serviceName: s.name,
    domain: GMAIL_DOMAIN,
    wholesale: s.wholesale,
    retail: retailFromGmailWholesale(s.wholesale),
    stock: s.stock,
    quality: s.quality,
    successAttempts: 0,
    successHits: 0,
    maxPrice: s.wholesale,
  }));
}

/**
 * Live Gmail (@gmail.com) offers ranked by OTP-success quality (mail route).
 * Multi-offer = multiple services; same quality ranking rules as SMS Auto.
 */
export async function listGmailOffers(): Promise<{
  ready: boolean;
  reason?: string;
  markupPercent: number;
  offers: GmailOfferRow[];
}> {
  const creds = await loadSmsBowerMailCreds();
  if (!creds.ready) {
    if (process.env.USE_MOCK_PROVIDERS === "true") {
      const offers = mockGmailOffers();
      return {
        ready: true,
        reason: "mock",
        markupPercent: GMAIL_MARKUP_PERCENT,
        offers,
      };
    }
    return {
      ready: false,
      reason: creds.reason,
      markupPercent: GMAIL_MARKUP_PERCENT,
      offers: [],
    };
  }

  const [services, priceMap, stats, dbServices] = await Promise.all([
    listMailServices(creds.apiKey, creds.handlerBaseUrl),
    getMailPriceRests(creds.apiKey, {
      domain: GMAIL_DOMAIN,
      handlerBaseUrl: creds.handlerBaseUrl,
    }),
    loadSuccessStatMap(),
    prisma.service.findMany({ select: { slug: true, name: true, enabled: true } }),
  ]);
  const dbBySlug = new Map(dbServices.map((s) => [s.slug, s]));

  const rows: GmailOfferRow[] = [];
  for (const [serviceCode, domains] of Object.entries(priceMap)) {
    const gmail = domains[GMAIL_DOMAIN] ?? domains["gmail"];
    if (!gmail || !(gmail.price > 0) || !(gmail.count > 0)) continue;
    const slug = slugForMailCode(serviceCode, services);
    if (!slug) continue;
    const db = dbBySlug.get(slug);
    if (db && db.enabled === false) continue;

    const wholesale = gmail.price;
    const bucket = priceBucket(wholesale);
    const exact = stats.get(
      successKey({
        server: 3,
        countryCode: GMAIL_COUNTRY_CODE,
        serviceSlug: slug,
        operator: GMAIL_OPERATOR,
        priceBucket: bucket,
      }),
    );
    const fallback = stats.get(
      successKey({
        server: 3,
        countryCode: GMAIL_COUNTRY_CODE,
        serviceSlug: slug,
        operator: "",
        priceBucket: bucket,
      }),
    );
    const quality = qualityScore({
      attempts: exact?.attempts,
      successes: exact?.successes,
      fallbackAttempts: fallback?.attempts,
      fallbackSuccesses: fallback?.successes,
    });

    rows.push({
      serviceSlug: slug,
      serviceCode,
      serviceName: displayNameFor(slug, serviceCode, services, db?.name),
      domain: GMAIL_DOMAIN,
      wholesale,
      retail: retailFromGmailWholesale(wholesale),
      stock: gmail.count,
      quality,
      successAttempts: exact?.attempts ?? fallback?.attempts ?? 0,
      successHits: exact?.successes ?? fallback?.successes ?? 0,
      maxPrice: wholesale,
    });
  }

  rows.sort((a, b) => {
    if (b.quality !== a.quality) return b.quality - a.quality;
    if (a.retail !== b.retail) return a.retail - b.retail;
    return a.serviceName.localeCompare(b.serviceName);
  });

  return {
    ready: true,
    markupPercent: GMAIL_MARKUP_PERCENT,
    offers: rows,
  };
}
