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
import { mockAdapter } from "./adapters/mock";
import { prisma } from "@/lib/prisma";

const SERVER_TO_PROVIDER: Record<number, ProviderKey> = {
  1: "sms-activate",
  2: "5sim",
  3: "grizzlysms",
};

export type ProviderSettingRow = {
  key: string;
  enabled: boolean;
  apiKey: string | null;
  priority: number;
};

function envKeyFor(provider: ProviderKey): string | undefined {
  if (provider === "sms-activate") return process.env.SMS_ACTIVATE_API_KEY?.trim();
  if (provider === "5sim") return process.env.FIVESIM_API_KEY?.trim();
  if (provider === "grizzlysms") return process.env.GRIZZLY_SMS_API_KEY?.trim();
  return undefined;
}

/** Demo mock only when explicitly enabled — never invent wholesale keys. */
function mocksAllowed() {
  return process.env.USE_MOCK_PROVIDERS === "true";
}

/** Build a live adapter from env or DB key. Returns null if no key / disabled. */
export function buildAdapter(
  key: ProviderKey,
  apiKey: string | null | undefined,
  enabled = true,
): SmsAdapter | null {
  if (!enabled) return null;
  if (key === "mock") return mockAdapter;
  const keyValue = apiKey?.trim() || envKeyFor(key);
  if (!keyValue) return null;
  if (key === "sms-activate") return createSmsActivateAdapter(keyValue);
  if (key === "5sim") return createFiveSimAdapter(keyValue);
  if (key === "grizzlysms") return createGrizzlySmsAdapter(keyValue);
  return null;
}

async function loadSettings(): Promise<ProviderSettingRow[]> {
  try {
    const rows = await prisma.providerSetting.findMany({
      orderBy: { priority: "asc" },
    });
    if (rows.length > 0) {
      return rows.map((r) => ({
        key: r.key,
        enabled: r.enabled,
        apiKey: r.apiKey,
        priority: r.priority,
      }));
    }
  } catch {
    // table may not exist yet on first boot — fall through to defaults
  }
  return [
    { key: "sms-activate", enabled: true, apiKey: null, priority: 1 },
    { key: "5sim", enabled: true, apiKey: null, priority: 2 },
    { key: "grizzlysms", enabled: true, apiKey: null, priority: 3 },
  ];
}

export class SmsAggregator {
  /** Ordered adapters for Auto failover (1 → 2 → 3). */
  async adaptersForBuy(server?: number | "auto"): Promise<SmsAdapter[]> {
    const settings = await loadSettings();
    const byKey = new Map(settings.map((s) => [s.key, s]));

    const orderedKeys: ProviderKey[] =
      server === 1 || server === 2 || server === 3
        ? [SERVER_TO_PROVIDER[server]]
        : (["sms-activate", "5sim", "grizzlysms"] as ProviderKey[]);

    // If settings have custom priority, sort Auto by priority
    if (server === "auto" || server === undefined) {
      orderedKeys.sort((a, b) => {
        const pa = byKey.get(a)?.priority ?? 99;
        const pb = byKey.get(b)?.priority ?? 99;
        return pa - pb;
      });
    }

    const adapters: SmsAdapter[] = [];
    for (const key of orderedKeys) {
      const setting = byKey.get(key);
      const enabled = setting?.enabled ?? true;
      const adapter = buildAdapter(key, setting?.apiKey, enabled);
      if (adapter) adapters.push(adapter);
    }

    if (adapters.length === 0 && mocksAllowed()) {
      adapters.push(mockAdapter);
    }
    return adapters;
  }

  async buy(input: BuyInput): Promise<BuyResult> {
    const adapters = await this.adaptersForBuy(input.server);
    if (adapters.length === 0) {
      throw new AllProvidersFailedError([
        {
          provider: "sms-activate",
          error:
            "MISSING_KEYS — paste SMS_ACTIVATE_API_KEY, FIVESIM_API_KEY, and/or GRIZZLY_SMS_API_KEY in Vercel or Admin",
        },
      ]);
    }

    const attempts: { provider: ProviderKey; error: string }[] = [];

    for (const adapter of adapters) {
      try {
        return await adapter.buy(input);
      } catch (e) {
        const msg =
          e instanceof ProviderNoStockError || e instanceof ProviderBalanceError
            ? e.code
            : e instanceof Error
              ? e.message.slice(0, 120)
              : "unknown";
        attempts.push({ provider: adapter.key, error: msg });
        // Fail over on NO_NUMBERS, NO_BALANCE, timeout, HTTP errors
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

  async adapterForKey(providerKey: string): Promise<SmsAdapter> {
    if (providerKey === "mock" || mocksAllowed()) {
      if (providerKey === "mock") return mockAdapter;
    }
    const settings = await loadSettings();
    const setting = settings.find((s) => s.key === providerKey);
    const adapter = buildAdapter(
      providerKey as ProviderKey,
      setting?.apiKey,
      setting?.enabled ?? true,
    );
    if (adapter) return adapter;
    if (mocksAllowed()) return mockAdapter;
    throw new Error(`Provider ${providerKey} unavailable`);
  }

  async balances(): Promise<
    { key: ProviderKey; name: string; balance: number | null; enabled: boolean; hasApiKey: boolean }[]
  > {
    const settings = await loadSettings();
    const keys: ProviderKey[] = ["sms-activate", "5sim", "grizzlysms"];
    const out = [];
    for (const key of keys) {
      const setting = settings.find((s) => s.key === key);
      const enabled = setting?.enabled ?? true;
      const hasApiKey = Boolean(setting?.apiKey?.trim() || envKeyFor(key));
      const adapter = buildAdapter(key, setting?.apiKey, enabled);
      let balance: number | null = null;
      if (adapter) {
        try {
          balance = await adapter.getBalance();
        } catch {
          balance = null;
        }
      }
      out.push({
        key,
        name:
          key === "sms-activate"
            ? "SMS-Activate"
            : key === "5sim"
              ? "5SIM"
              : "Grizzly SMS",
        balance,
        enabled,
        hasApiKey,
      });
    }
    if (mocksAllowed()) {
      out.push({
        key: "mock" as ProviderKey,
        name: "Mock (demo)",
        balance: 999,
        enabled: true,
        hasApiKey: false,
      });
    }
    return out;
  }
}

export const smsAggregator = new SmsAggregator();

export function serverNumberForProvider(key: ProviderKey): number {
  if (key === "sms-activate") return 1;
  if (key === "5sim") return 2;
  if (key === "grizzlysms") return 3;
  return 1;
}
