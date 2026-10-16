import { buildAdapterForSlot } from "./aggregator";
import { loadProviderSlots, type SlotRow } from "./provider-slots";
import type { ProviderPriceRow } from "./types";

export type SlotLiveStock = {
  slot: 1 | 2 | 3;
  providerType: string;
  bySlug: Map<string, ProviderPriceRow>;
};

const PRICE_TIMEOUT_MS = 3500;
/** SMS-Man needs applications + get-prices; allow more headroom on Vercel. */
const SMS_MAN_PRICE_TIMEOUT_MS = 12_000;

async function pricesForSlot(
  slot: SlotRow,
  countryCode: string,
): Promise<Map<string, ProviderPriceRow>> {
  const out = new Map<string, ProviderPriceRow>();
  try {
    const adapter = buildAdapterForSlot(slot);
    if (!adapter?.getPrices) return out;

    const timeoutMs =
      slot.providerType === "sms-man" ? SMS_MAN_PRICE_TIMEOUT_MS : PRICE_TIMEOUT_MS;

    const rows = await Promise.race([
      adapter.getPrices(countryCode),
      new Promise<ProviderPriceRow[]>((resolve) =>
        setTimeout(() => resolve([]), timeoutMs),
      ),
    ]);
    for (const r of rows) {
      if (!r.serviceSlug) continue;
      if (!(r.wholesale > 0)) continue;
      out.set(r.serviceSlug, r);
    }
  } catch (err) {
    // Never log API keys / tokens — message only
    console.error(
      `[live-stock] slot ${slot.priority} ${slot.providerType}`,
      err instanceof Error ? err.message.slice(0, 120) : "error",
    );
  }
  return out;
}

/**
 * Live wholesale rows per Admin Server slot (1|2|3).
 * Uses Admin ProviderSetting keys via buildAdapterForSlot — never logs secrets.
 * Each slot is fetched independently so 5SIM / Grizzly / SMS-Man prices stay distinct.
 */
export async function fetchLiveStockBySlot(
  countryCode: string,
): Promise<Map<number, SlotLiveStock>> {
  const result = new Map<number, SlotLiveStock>();
  try {
    const slots = await loadProviderSlots();
    await Promise.all(
      slots.map(async (slot) => {
        if (!slot.enabled) {
          result.set(slot.priority, {
            slot: slot.priority as 1 | 2 | 3,
            providerType: slot.providerType,
            bySlug: new Map(),
          });
          return;
        }
        const bySlug = await pricesForSlot(slot, countryCode);
        result.set(slot.priority, {
          slot: slot.priority as 1 | 2 | 3,
          providerType: slot.providerType,
          bySlug,
        });
      }),
    );
  } catch (err) {
    console.error(
      "[live-stock] slots",
      err instanceof Error ? err.message : "error",
    );
  }
  return result;
}

/**
 * @deprecated Prefer fetchLiveStockBySlot — kept for any legacy 5SIM-only callers.
 */
export async function fetchFiveSimLiveStock(
  countryCode: string,
): Promise<Map<string, ProviderPriceRow>> {
  const bySlot = await fetchLiveStockBySlot(countryCode);
  for (const entry of bySlot.values()) {
    if (entry.providerType === "5sim" && entry.bySlug.size > 0) {
      return entry.bySlug;
    }
  }
  // Fall back to first non-empty slot map
  for (const entry of bySlot.values()) {
    if (entry.bySlug.size > 0) return entry.bySlug;
  }
  return new Map();
}
