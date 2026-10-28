import { createSaCompatibleAdapter } from "./sa-compatible";
import { fetchGrizzlyWebMultiOffers } from "./grizzly-web-prices";
import type { ProviderPriceRow, SmsAdapter } from "../types";

function defaultBaseUrl() {
  return (
    process.env.GRIZZLY_SMS_BASE_URL?.trim() ||
    "https://api.grizzlysms.com/stubs/handler_api.php"
  );
}

/** Probe Grizzly api_key via getBalance — never logs the key. */
export async function probeGrizzlyApiKey(
  apiKey: string,
  baseUrl?: string | null,
): Promise<{ ok: boolean; error?: string; balance?: number | null }> {
  const key = apiKey.trim();
  if (!key) return { ok: false, error: "Paste your Grizzly SMS API key from grizzlysms.com." };
  if (/^https?:\/\//i.test(key) || key.includes("handler_api")) {
    return {
      ok: false,
      error:
        "That looks like an API URL, not the Grizzly api_key. Copy the key from your Grizzly account page only.",
    };
  }
  try {
    const url = new URL(baseUrl?.trim() || defaultBaseUrl());
    url.searchParams.set("api_key", key);
    url.searchParams.set("action", "getBalance");
    const res = await fetch(url.toString(), { cache: "no-store" });
    const text = (await res.text()).trim();
    if (text.startsWith("ACCESS_BALANCE:")) {
      const bal = Number(text.split(":")[1]);
      return { ok: true, balance: Number.isFinite(bal) ? bal : null };
    }
    if (/bad.?key|wrong.?key|no.?key|error/i.test(text)) {
      return { ok: false, error: "Grizzly rejected this API key. Copy it again from grizzlysms.com." };
    }
    return {
      ok: false,
      error: "Grizzly did not accept this key (unexpected getBalance response).",
    };
  } catch {
    return { ok: false, error: "Could not reach Grizzly getBalance." };
  }
}

/**
 * Merge web multi-offers with SA handler fallback.
 * Prefer distinct web provider/price rows; fill services the web catalog omits
 * from classic getPrices (still no invented stock).
 */
export function mergeGrizzlyPriceRows(
  webRows: ProviderPriceRow[],
  saRows: ProviderPriceRow[],
): ProviderPriceRow[] {
  const haveSlug = new Set(webRows.map((r) => r.serviceSlug));
  const out = [...webRows];
  for (const row of saRows) {
    if (haveSlug.has(row.serviceSlug)) continue;
    out.push(row);
  }
  return out;
}

export function createGrizzlySmsAdapter(
  apiKey: string,
  baseUrl?: string | null,
): SmsAdapter {
  const sa = createSaCompatibleAdapter({
    apiKey,
    providerKey: "grizzlysms",
    displayName: "Grizzly SMS",
    baseUrl: baseUrl?.trim() || defaultBaseUrl(),
  });

  return {
    ...sa,
    /**
     * Prefer Grizzly website multi-network/price tiers (same as grizzlysms.com),
     * then fill gaps from SA getPrices. Ranking / 8-cap / 20% markup happen in shop.
     */
    async getPrices(countryCode?: string): Promise<ProviderPriceRow[]> {
      const iso = (countryCode ?? "US").toUpperCase();
      const [webRows, saRows] = await Promise.all([
        fetchGrizzlyWebMultiOffers(iso).catch(() => [] as ProviderPriceRow[]),
        sa.getPrices?.(iso).catch(() => [] as ProviderPriceRow[]) ??
          Promise.resolve([] as ProviderPriceRow[]),
      ]);
      if (webRows.length > 0) return mergeGrizzlyPriceRows(webRows, saRows);
      return saRows;
    },
  };
}
