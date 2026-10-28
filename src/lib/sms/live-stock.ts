import { buildAdapterForSlot } from "./aggregator";
import { isPlausibleOtpWholesale } from "./otp-price-guards";
import { loadProviderSlots, type SlotRow } from "./provider-slots";
import type { ProviderPriceRow } from "./types";

export type SlotLiveStock = {
  slot: 1 | 2 | 3;
  providerType: string;
  enabled: boolean;
  hasKey: boolean;
  /** Cheapest in-stock row per service (legacy single-offer callers). */
  bySlug: Map<string, ProviderPriceRow>;
  /** All live offer rows per service slug (multi-operator / multi-price). */
  offersBySlug: Map<string, ProviderPriceRow[]>;
  /** Plain customer/admin hint — never brands or env names */
  status: "live" | "empty" | "disabled" | "no_key" | "error";
};

/** Hard cap so one slow wholesale never 504s the whole /services response. */
const OVERALL_BUDGET_MS = 4_500;
const SLOT_TIMEOUT_MS = 2_800;
const FIVESIM_SLOT_TIMEOUT_MS = 3_200;

function indexRows(rows: ProviderPriceRow[]): {
  bySlug: Map<string, ProviderPriceRow>;
  offersBySlug: Map<string, ProviderPriceRow[]>;
} {
  const offersBySlug = new Map<string, ProviderPriceRow[]>();
  for (const r of rows) {
    if (!r.serviceSlug) continue;
    if (!(r.wholesale > 0)) continue;
    // Defense in depth: drop absurd wholesale (provider-id / wrong units)
    if (!isPlausibleOtpWholesale(r.wholesale)) continue;
    const list = offersBySlug.get(r.serviceSlug) ?? [];
    list.push(r);
    offersBySlug.set(r.serviceSlug, list);
  }
  const bySlug = new Map<string, ProviderPriceRow>();
  for (const [slug, list] of offersBySlug) {
    const inStock = list.filter((x) => x.available !== false && (x.stock ?? 1) > 0);
    const pool = inStock.length > 0 ? inStock : list;
    pool.sort((a, b) => a.wholesale - b.wholesale);
    bySlug.set(slug, pool[0]!);
  }
  return { bySlug, offersBySlug };
}

async function pricesForSlot(
  slot: SlotRow,
  countryCode: string,
): Promise<{ bySlug: Map<string, ProviderPriceRow>; offersBySlug: Map<string, ProviderPriceRow[]> }> {
  const empty = { bySlug: new Map<string, ProviderPriceRow>(), offersBySlug: new Map<string, ProviderPriceRow[]>() };
  try {
    // 5SIM guest catalog is public — still overlay when Disabled / key missing / URL junk
    let adapter = buildAdapterForSlot(slot);
    if (!adapter?.getPrices && slot.providerType === "5sim") {
      const { createFiveSimAdapter } = await import("./adapters/fivesim");
      adapter = createFiveSimAdapter("guest");
    }
    if (!adapter?.getPrices) return empty;

    const timeoutMs =
      slot.providerType === "5sim" ? FIVESIM_SLOT_TIMEOUT_MS : SLOT_TIMEOUT_MS;

    let rows = await Promise.race([
      adapter.getPrices(countryCode),
      new Promise<ProviderPriceRow[]>((resolve) =>
        setTimeout(() => resolve([]), timeoutMs),
      ),
    ]);

    // Keyed 5SIM empty → one short guest retry (still inside slot timeout budget)
    if (rows.length === 0 && slot.providerType === "5sim" && adapter.key === "5sim") {
      const { createFiveSimAdapter } = await import("./adapters/fivesim");
      const guest = createFiveSimAdapter("guest");
      if (guest.getPrices) {
        rows = await Promise.race([
          guest.getPrices(countryCode),
          new Promise<ProviderPriceRow[]>((resolve) =>
            setTimeout(() => resolve([]), Math.min(2_000, timeoutMs)),
          ),
        ]);
      }
    }

    return indexRows(rows);
  } catch (err) {
    console.error(
      `[live-stock] slot ${slot.priority} ${slot.providerType}`,
      err instanceof Error ? err.message.slice(0, 120) : "error",
    );
    return empty;
  }
}

function emptyEntry(slot: SlotRow, status: SlotLiveStock["status"]): SlotLiveStock {
  return {
    slot: slot.priority as 1 | 2 | 3,
    providerType: slot.providerType,
    enabled: slot.enabled,
    hasKey: Boolean(slot.apiKey?.trim()),
    bySlug: new Map(),
    offersBySlug: new Map(),
    status,
  };
}

/**
 * Live wholesale rows per Admin Server slot (1|2|3).
 * Each slot is isolated: one failure/timeout must not empty the others or 504 /services.
 */
export async function fetchLiveStockBySlot(
  countryCode: string,
): Promise<Map<number, SlotLiveStock>> {
  const result = new Map<number, SlotLiveStock>();
  try {
    const slots = await loadProviderSlots();
    // Pre-seed so partial timeout still returns all three tabs
    for (const slot of slots) {
      const status: SlotLiveStock["status"] = !slot.enabled
        ? "disabled"
        : !slot.apiKey?.trim() && slot.providerType !== "5sim"
          ? "no_key"
          : "empty";
      result.set(slot.priority, emptyEntry(slot, status));
    }

    const work = Promise.all(
      slots.map(async (slot) => {
        // Disabled non-5SIM: leave empty (no wholesale call)
        if (!slot.enabled && slot.providerType !== "5sim") {
          return;
        }
        try {
          const { bySlug, offersBySlug } = await pricesForSlot(slot, countryCode);
          const status: SlotLiveStock["status"] =
            bySlug.size > 0
              ? "live"
              : !slot.enabled
                ? "disabled"
                : !slot.apiKey?.trim()
                  ? "no_key"
                  : "empty";
          result.set(slot.priority, {
            slot: slot.priority as 1 | 2 | 3,
            providerType: slot.providerType,
            enabled: slot.enabled,
            hasKey: Boolean(slot.apiKey?.trim()),
            bySlug,
            offersBySlug,
            status,
          });
        } catch {
          result.set(
            slot.priority,
            emptyEntry(slot, "error"),
          );
        }
      }),
    );

    await Promise.race([
      work,
      new Promise<void>((resolve) => setTimeout(resolve, OVERALL_BUDGET_MS)),
    ]);
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
  for (const entry of bySlot.values()) {
    if (entry.bySlug.size > 0) return entry.bySlug;
  }
  return new Map();
}
