import { buildAdapter } from "./aggregator";
import { prisma } from "@/lib/prisma";
import type { ProviderPriceRow } from "./types";

/**
 * Fetch live 5SIM stock/prices for one country when keyed.
 * Never throws; never shrinks the country list — callers overlay onto services only.
 */
export async function fetchFiveSimLiveStock(
  countryCode: string,
): Promise<Map<string, ProviderPriceRow>> {
  const out = new Map<string, ProviderPriceRow>();
  try {
    let apiKey: string | null = process.env.FIVESIM_API_KEY?.trim() || null;
    if (!apiKey) {
      const row = await prisma.providerSetting.findUnique({ where: { key: "5sim" } });
      if (row?.enabled === false) return out;
      apiKey = row?.apiKey?.trim() || null;
    }
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
