import { buildAdapter } from "./aggregator";
import { loadProviderSlots, envKeyForType } from "./provider-slots";
import type { ProviderPriceRow } from "./types";

/**
 * Fetch live 5SIM stock/prices for one country when a slot uses 5SIM.
 * Prefer Admin ProviderSetting key over env. Never throws.
 */
export async function fetchFiveSimLiveStock(
  countryCode: string,
): Promise<Map<string, ProviderPriceRow>> {
  const out = new Map<string, ProviderPriceRow>();
  try {
    const slots = await loadProviderSlots().catch(() => []);
    const five = slots.find((s) => s.providerType === "5sim" && s.enabled);
    const apiKey: string | null =
      five?.apiKey?.trim() || envKeyForType("5sim") || process.env.FIVESIM_API_KEY?.trim() || null;
    if (!apiKey) return out;

    const adapter = buildAdapter("5sim", apiKey, true);
    if (!adapter?.getPrices) return out;
    const rows = await Promise.race([
      adapter.getPrices(countryCode),
      new Promise<ProviderPriceRow[]>((resolve) => setTimeout(() => resolve([]), 2500)),
    ]);
    for (const r of rows) out.set(r.serviceSlug, r);
  } catch (err) {
    console.error(
      "[live-stock] 5sim",
      err instanceof Error ? err.message : err,
    );
  }
  return out;
}
