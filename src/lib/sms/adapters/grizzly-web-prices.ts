/**
 * Grizzly's own site multi-offer catalog (public web API).
 *
 * SA handler getPrices collapses to one {cost,count} per service. The website
 * surfaces multiple networks/prices via:
 *   GET https://grizzlysms.com/api/country/get-prices/{serviceId}?wholesale=0&user=0
 * each country row includes prices: [{ providerId, value, quantity, delivery }].
 *
 * Never logs API keys (this path does not use them).
 */

import { SA_COUNTRY, SA_SERVICE } from "../service-map";
import { isPlausibleOtpWholesale } from "../otp-price-guards";
import type { ProviderPriceRow } from "../types";

const GRIZZLY_WEB_API = "https://grizzlysms.com/api";
const SERVICE_CACHE_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 2_200;

type WebService = {
  id: number;
  external_id: string;
  slug: string;
  name: string;
};

type WebPriceTier = {
  name?: string;
  providerId?: string | number;
  delivery?: number | string | null;
  quantity?: number | string;
  value?: number | string;
};

type WebCountryRow = {
  service_external_id?: string;
  service_slug?: string;
  country_external_id?: string | number;
  price?: string | number;
  count?: number | string;
  prices?: WebPriceTier[];
};

/** Slug/code aliases when Grizzly's external_id differs from SA_SERVICE. */
const EXTERNAL_ID_ALIASES: Record<string, string[]> = {
  google: ["go", "gmail"],
  openai: ["dr", "ai"],
  signal: ["gr_sg", "bw", "sg"],
  microsoft: ["mm", "hot", "outlook"],
  twitter: ["tw", "x"],
};

let serviceCache: { at: number; list: WebService[] } | null = null;

async function fetchJson(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "TempEmpireShop/1.0",
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadWebServices(): Promise<WebService[]> {
  if (serviceCache && Date.now() - serviceCache.at < SERVICE_CACHE_MS) {
    return serviceCache.list;
  }
  const json = await fetchJson(`${GRIZZLY_WEB_API}/service`);
  if (!Array.isArray(json)) return serviceCache?.list ?? [];
  const list: WebService[] = [];
  for (const row of json) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = Number(o.id);
    const external_id = String(o.external_id ?? "").toLowerCase();
    const slug = String(o.slug ?? "").toLowerCase();
    const name = String(o.name ?? slug);
    if (!(id > 0) || !external_id) continue;
    list.push({ id, external_id, slug, name });
  }
  if (list.length > 0) serviceCache = { at: Date.now(), list };
  return list;
}

/** Map our catalog slug → Grizzly numeric service id(s). */
function resolveWebServiceIds(
  list: WebService[],
  slug: string,
): number[] {
  const code = (SA_SERVICE[slug] ?? "").toLowerCase();
  const aliases = new Set<string>([
    slug.toLowerCase(),
    code,
    ...(EXTERNAL_ID_ALIASES[slug] ?? []),
  ]);
  const hits: number[] = [];
  const seen = new Set<number>();
  for (const s of list) {
    if (
      aliases.has(s.external_id) ||
      aliases.has(s.slug) ||
      (code && s.external_id === code)
    ) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        hits.push(s.id);
      }
    }
  }
  return hits;
}

function asFinite(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

/** Expand one Grizzly country row's prices[] into shop ProviderPriceRow list. */
export function expandGrizzlyWebCountryRow(
  match: WebCountryRow,
  opts: { countryCode: string; serviceSlug: string },
): ProviderPriceRow[] {
  const rows: ProviderPriceRow[] = [];
  const seen = new Set<string>();
  const push = (partial: {
    wholesale: number;
    stock: number;
    operator?: string;
    networkLabel?: string;
    providerRate?: number;
  }) => {
    if (!(partial.wholesale > 0) || !(partial.stock > 0)) return;
    if (!isPlausibleOtpWholesale(partial.wholesale)) return;
    const offerKey = [
      opts.serviceSlug,
      partial.operator ?? "",
      partial.wholesale.toFixed(4),
    ].join(":");
    if (seen.has(offerKey)) return;
    seen.add(offerKey);
    rows.push({
      countryCode: opts.countryCode,
      serviceSlug: opts.serviceSlug,
      wholesale: partial.wholesale,
      available: true,
      stock: partial.stock,
      operator: partial.operator,
      networkLabel: partial.networkLabel,
      maxPrice: partial.wholesale,
      providerRate: partial.providerRate,
      offerKey,
    });
  };

  const tiers = Array.isArray(match.prices) ? match.prices : [];
  if (tiers.length > 0) {
    for (const tier of tiers) {
      const wholesale = asFinite(tier.value);
      const stock = asFinite(tier.quantity);
      const providerIds = String(tier.providerId ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const operator = providerIds.join(",") || undefined;
      const delivery = asFinite(tier.delivery);
      // Keep operator ids for purchase routing; shop UI shows calm Primary / Network N.
      push({
        wholesale,
        stock,
        operator,
        networkLabel: "Network",
        providerRate: delivery > 0 ? delivery : undefined,
      });
    }
    return rows;
  }

  const wholesale = asFinite(match.price);
  const stock = asFinite(match.count);
  if (wholesale > 0 && stock > 0) {
    push({ wholesale, stock, networkLabel: "Any network" });
  }
  return rows;
}

/**
 * Live multi-network / multi-price rows for one ISO country, matching Grizzly web.
 * Only real in-stock tiers — never invents stock.
 */
export async function fetchGrizzlyWebMultiOffers(
  countryCode: string,
): Promise<ProviderPriceRow[]> {
  const iso = (countryCode ?? "US").toUpperCase();
  const countryId = SA_COUNTRY[iso];
  if (!countryId) return [];

  const services = await loadWebServices();
  if (services.length === 0) return [];

  const slugTargets = Object.keys(SA_SERVICE);
  const jobs: Array<{ slug: string; serviceId: number }> = [];
  const seenService = new Set<number>();
  for (const slug of slugTargets) {
    for (const sid of resolveWebServiceIds(services, slug)) {
      if (seenService.has(sid)) continue;
      seenService.add(sid);
      jobs.push({ slug, serviceId: sid });
    }
  }
  if (jobs.length === 0) return [];

  const parts = await Promise.all(
    jobs.map(async ({ slug, serviceId }) => {
      const json = await fetchJson(
        `${GRIZZLY_WEB_API}/country/get-prices/${serviceId}?wholesale=0&user=0`,
      );
      if (!Array.isArray(json)) return [] as ProviderPriceRow[];
      const match = (json as WebCountryRow[]).find(
        (r) => String(r.country_external_id ?? "") === String(countryId),
      );
      if (!match) return [] as ProviderPriceRow[];
      return expandGrizzlyWebCountryRow(match, {
        countryCode: iso,
        serviceSlug: slug,
      });
    }),
  );

  const rows: ProviderPriceRow[] = [];
  const seenOffer = new Set<string>();
  for (const list of parts) {
    for (const row of list) {
      const key = row.offerKey ?? `${row.serviceSlug}:${row.operator ?? ""}:${row.wholesale}`;
      if (seenOffer.has(key)) continue;
      seenOffer.add(key);
      rows.push(row);
    }
  }
  return rows;
}
