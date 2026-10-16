import {
  AllProvidersFailedError,
  BuyInput,
  BuyResult,
  ProviderKey,
  ProviderNoStockError,
  ProviderBalanceError,
  SmsAdapter,
  SmsStatus,
} from "./types";
import { createSmsActivateAdapter } from "./adapters/sms-activate";
import { createFiveSimAdapter } from "./adapters/fivesim";
import { createGrizzlySmsAdapter } from "./adapters/grizzlysms";
import { createSmsManAdapter, isSmsManDocsUrl } from "./adapters/sms-man";
import { createSaCompatibleAdapter } from "./adapters/sa-compatible";
import { mockAdapter } from "./adapters/mock";
import {
  DEFAULT_SLOT_MARKUP,
  defaultBaseUrlForType,
  displayNameForType,
  envKeyForType,
  loadProviderSlots,
  providerKeyForType,
  type SlotProviderType,
  type SlotRow,
} from "./provider-slots";

function mocksAllowed() {
  return process.env.USE_MOCK_PROVIDERS === "true";
}

export type SlotAdapter = {
  slot: 1 | 2 | 3;
  providerType: SlotProviderType;
  markupPercent: number;
  adapter: SmsAdapter;
};

/** Build live adapter from Admin slot (Admin key preferred over env). */
export function buildAdapterForSlot(slot: SlotRow): SmsAdapter | null {
  if (!slot.enabled) return null;
  // Prefer Admin ProviderSetting apiKey over env
  const keyValue = slot.apiKey?.trim() || envKeyForType(slot.providerType);
  if (!keyValue) return null;

  const type = slot.providerType;
  if (type === "5sim") return createFiveSimAdapter(keyValue);
  if (type === "grizzlysms") {
    return createGrizzlySmsAdapter(keyValue, slot.baseUrl);
  }
  if (type === "sms-man") {
    // Never treat get-sms docs URL as a token
    if (isSmsManDocsUrl(keyValue)) return null;
    return createSmsManAdapter(keyValue);
  }
  if (type === "custom-sa") {
    const base = slot.baseUrl?.trim();
    if (!base) return null;
    return createSaCompatibleAdapter({
      apiKey: keyValue,
      providerKey: "sms-activate",
      displayName: "Custom SMS-Activate API",
      baseUrl: base,
    });
  }
  return createSmsActivateAdapter(keyValue, slot.baseUrl);
}

/** @deprecated Prefer buildAdapterForSlot — kept for live-stock 5SIM overlay. */
export function buildAdapter(
  key: ProviderKey,
  apiKey: string | null | undefined,
  enabled = true,
): SmsAdapter | null {
  if (!enabled) return null;
  if (key === "mock") return mockAdapter;
  const keyValue = apiKey?.trim() || envKeyForType(key as SlotProviderType);
  if (!keyValue) return null;
  if (key === "sms-activate") return createSmsActivateAdapter(keyValue);
  if (key === "5sim") return createFiveSimAdapter(keyValue);
  if (key === "grizzlysms") return createGrizzlySmsAdapter(keyValue);
  if (key === "sms-man") {
    if (isSmsManDocsUrl(keyValue)) return null;
    return createSmsManAdapter(keyValue);
  }
  return null;
}

/**
 * Resolve ordered slot adapters for buy.
 * - Skips empty/disabled slots (no crash on missing 5SIM).
 * - If Server 2 empty and Server 3 is still Grizzly with a key, fill Server 2 from S3.
 *   (S3 default is now SMS-Man — do not copy SMS-Man tokens onto S2.)
 */
export function resolveSlotAdapters(slots: SlotRow[]): SlotAdapter[] {
  const byPriority = new Map(slots.map((s) => [s.priority, s]));
  const slot3 = byPriority.get(3);
  const slot2 = byPriority.get(2);

  const effective: SlotRow[] = slots.map((s) => ({ ...s }));

  // Fill empty Server 2 from Grizzly Server 3 only when S3 is Grizzly
  if (slot2 && slot3) {
    const s2HasKey = Boolean(slot2.apiKey?.trim() || envKeyForType(slot2.providerType));
    const s3HasKey = Boolean(slot3.apiKey?.trim() || envKeyForType(slot3.providerType));
    const s2EmptyOrDisabled = !slot2.enabled || !s2HasKey;
    if (
      s2EmptyOrDisabled &&
      slot3.enabled &&
      s3HasKey &&
      slot3.providerType === "grizzlysms"
    ) {
      const idx = effective.findIndex((e) => e.priority === 2);
      if (idx >= 0) {
        effective[idx] = {
          ...slot2,
          enabled: true,
          providerType: "grizzlysms",
          apiKey: slot3.apiKey,
          baseUrl: slot3.baseUrl,
          markupPercent:
            slot3.markupPercent > 0 ? slot3.markupPercent : DEFAULT_SLOT_MARKUP,
        };
      }
    }
  }

  const out: SlotAdapter[] = [];
  for (const slot of effective.sort((a, b) => a.priority - b.priority)) {
    const adapter = buildAdapterForSlot(slot);
    if (!adapter) continue;
    const markup = slot.markupPercent > 0 ? slot.markupPercent : DEFAULT_SLOT_MARKUP;
    out.push({
      slot: slot.priority as 1 | 2 | 3,
      providerType: slot.providerType,
      markupPercent: markup,
      adapter,
    });
  }
  return out;
}

export class SmsAggregator {
  async adaptersForBuy(server?: number | "auto"): Promise<SlotAdapter[]> {
    const slots = await loadProviderSlots();
    const resolved = resolveSlotAdapters(slots);

    if (server === 1 || server === 2 || server === 3) {
      return resolved.filter((r) => r.slot === server);
    }
    return resolved;
  }

  async buy(input: BuyInput): Promise<BuyResult> {
    let adapters = await this.adaptersForBuy(input.server);
    if (adapters.length === 0) {
      throw new AllProvidersFailedError([
        {
          provider: "sms-activate",
          error:
            "MISSING_KEYS — paste wholesale API keys in Admin → Server 1/2/3 (or env SMS_ACTIVATE_API_KEY / FIVESIM_API_KEY / GRIZZLY_SMS_API_KEY / SMS_MAN_API_KEY)",
        },
      ]);
    }

    // Auto: try cheapest live retail first (not always Server 1 → 2 → 3)
    // Dynamic import avoids circular dep with live-stock → buildAdapterForSlot
    if (input.server === "auto" || input.server === undefined) {
      try {
        const { fetchLiveStockBySlot } = await import("./live-stock");
        const live = await fetchLiveStockBySlot(input.countryCode);
        const slug = input.serviceSlug.toLowerCase();
        adapters = [...adapters].sort((a, b) => {
          const wa = live.get(a.slot)?.bySlug.get(slug)?.wholesale;
          const wb = live.get(b.slot)?.bySlug.get(slug)?.wholesale;
          if (wa == null && wb == null) return a.slot - b.slot;
          if (wa == null || !(wa > 0)) return 1;
          if (wb == null || !(wb > 0)) return -1;
          const ra = wa * (1 + a.markupPercent / 100);
          const rb = wb * (1 + b.markupPercent / 100);
          return ra - rb;
        });
      } catch {
        /* keep slot order */
      }
    }

    const attempts: { provider: ProviderKey; error: string }[] = [];

    for (const { adapter, slot, markupPercent } of adapters) {
      try {
        const result = await adapter.buy(input);
        return {
          ...result,
          serverSlot: slot,
          markupPercent,
        };
      } catch (e) {
        const msg =
          e instanceof ProviderNoStockError || e instanceof ProviderBalanceError
            ? e.code
            : e instanceof Error
              ? e.message.slice(0, 120)
              : "unknown";
        attempts.push({ provider: adapter.key, error: msg });
        continue;
      }
    }

    throw new AllProvidersFailedError(attempts);
  }

  async checkSMS(providerKey: string, providerOrderId: string): Promise<SmsStatus> {
    const adapter = await this.adapterForKey(providerKey);
    return adapter.checkSMS(providerOrderId);
  }

  async cancel(providerKey: string, providerOrderId: string): Promise<void> {
    const adapter = await this.adapterForKey(providerKey);
    await adapter.cancel(providerOrderId);
  }

  /** Find an adapter matching order providerKey (try all slots of that type). */
  async adapterForKey(providerKey: string): Promise<SmsAdapter> {
    if (providerKey === "mock") {
      if (mocksAllowed()) return mockAdapter;
    }
    const slots = await loadProviderSlots();
    const resolved = resolveSlotAdapters(slots);
    const match = resolved.find((r) => r.adapter.key === providerKey);
    if (match) return match.adapter;

    // Try every slot of matching type / legacy env
    for (const slot of slots) {
      if (providerKeyForType(slot.providerType) === providerKey || slot.providerType === providerKey) {
        const adapter = buildAdapterForSlot(slot);
        if (adapter) return adapter;
      }
    }

    const legacy = buildAdapter(providerKey as ProviderKey, null, true);
    if (legacy) return legacy;
    if (mocksAllowed()) return mockAdapter;
    throw new Error(`Provider ${providerKey} unavailable`);
  }

  async balances(): Promise<
    {
      key: string;
      slot: number;
      providerType: SlotProviderType;
      name: string;
      balance: number | null;
      enabled: boolean;
      hasApiKey: boolean;
      markupPercent: number;
    }[]
  > {
    const slots = await loadProviderSlots();
    const out = [];
    for (const slot of slots) {
      const hasApiKey = Boolean(slot.apiKey?.trim() || envKeyForType(slot.providerType));
      const adapter = buildAdapterForSlot(slot);
      let balance: number | null = null;
      if (adapter) {
        try {
          balance = await adapter.getBalance();
        } catch {
          balance = null;
        }
      }
      out.push({
        key: slot.key,
        slot: slot.priority,
        providerType: slot.providerType,
        name: `Server ${slot.priority} · ${displayNameForType(slot.providerType)}`,
        balance,
        enabled: slot.enabled,
        hasApiKey,
        markupPercent: slot.markupPercent > 0 ? slot.markupPercent : DEFAULT_SLOT_MARKUP,
      });
    }
    if (mocksAllowed()) {
      out.push({
        key: "mock",
        slot: 0,
        providerType: "sms-activate" as SlotProviderType,
        name: "Mock (demo)",
        balance: 999,
        enabled: true,
        hasApiKey: false,
        markupPercent: 20,
      });
    }
    return out;
  }
}

export const smsAggregator = new SmsAggregator();

export function serverNumberForProvider(key: ProviderKey): number {
  if (key === "5sim") return 1;
  if (key === "grizzlysms") return 2;
  if (key === "sms-man") return 3;
  if (key === "sms-activate") return 1;
  return 1;
}

export { defaultBaseUrlForType };
