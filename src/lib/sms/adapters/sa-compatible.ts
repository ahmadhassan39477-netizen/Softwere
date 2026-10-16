import {
  BuyInput,
  BuyResult,
  ProviderBalanceError,
  ProviderKey,
  ProviderNoStockError,
  ProviderPriceRow,
  SmsAdapter,
  SmsStatus,
} from "../types";
import { SA_COUNTRY, SA_SERVICE } from "../service-map";

export type SaCompatibleOptions = {
  apiKey: string;
  providerKey: ProviderKey;
  displayName: string;
  baseUrl: string;
};

type PriceCell = {
  cost?: string | number;
  price?: string | number;
  count?: string | number;
};

function cellWholesale(info: PriceCell): number {
  const n = Number(info.cost ?? info.price ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isServicePriceMap(obj: unknown): obj is Record<string, PriceCell> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const vals = Object.values(obj as Record<string, unknown>);
  if (vals.length === 0) return false;
  // Reject error / balance-shaped objects
  if ("error_code" in (obj as object) || "success" in (obj as object)) return false;
  return vals.every(
    (v) =>
      v &&
      typeof v === "object" &&
      ("cost" in v || "price" in v || "count" in v),
  );
}

/**
 * SA/Grizzly getPrices may return:
 * - { [countryId]: { [serviceCode]: { cost, count } } }
 * - { [serviceCode]: { cost, count } } when country is filtered
 */
export function extractSaServicePriceMap(
  json: unknown,
  countryId: string,
): Record<string, PriceCell> | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const tree = json as Record<string, unknown>;
  const nested = tree[String(countryId)] ?? tree[countryId];
  if (isServicePriceMap(nested)) return nested;
  if (isServicePriceMap(tree)) return tree;
  return null;
}

/** SMS-Activate–compatible handler_api (SMS-Activate, Grizzly, custom). */
export function createSaCompatibleAdapter(opts: SaCompatibleOptions): SmsAdapter {
  const { apiKey, providerKey, displayName, baseUrl } = opts;

  async function call(params: Record<string, string>) {
    const url = new URL(baseUrl);
    url.searchParams.set("api_key", apiKey);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { cache: "no-store" });
    return (await res.text()).trim();
  }

  return {
    key: providerKey,
    displayName,

    async buy(input: BuyInput): Promise<BuyResult> {
      const service = SA_SERVICE[input.serviceSlug.toLowerCase()];
      const country = SA_COUNTRY[input.countryCode.toUpperCase()];
      if (!service || !country) throw new ProviderNoStockError("UNSUPPORTED_ROUTE");

      const text = await call({ action: "getNumber", service, country });
      if (text === "NO_NUMBERS" || text === "NO_NUMBER") throw new ProviderNoStockError(text);
      if (text === "NO_BALANCE") throw new ProviderBalanceError(text);
      if (!text.startsWith("ACCESS_NUMBER:")) throw new Error(text.slice(0, 120) || "buy_failed");

      const [, id, phone] = text.split(":");
      if (!id || !phone) throw new Error("incomplete_response");

      // Best-effort wholesale for retail charge (never throws)
      let wholesaleCost = 0;
      try {
        const priceText = await call({ action: "getPrices", country });
        const priceJson = priceText ? JSON.parse(priceText) : null;
        const map = extractSaServicePriceMap(priceJson, String(country));
        const cell = map?.[service];
        if (cell) wholesaleCost = cellWholesale(cell);
      } catch {
        wholesaleCost = 0;
      }

      return {
        providerKey,
        providerOrderId: id,
        phoneNumber: phone.startsWith("+") ? phone : `+${phone}`,
        wholesaleCost,
      };
    },

    async checkSMS(providerOrderId: string): Promise<SmsStatus> {
      const text = await call({ action: "getStatus", id: providerOrderId });
      if (text.startsWith("STATUS_OK:")) {
        const code = text.slice("STATUS_OK:".length).trim();
        return { status: "RECEIVED", code, message: `Your verification code is ${code}` };
      }
      if (text.includes("STATUS_CANCEL")) return { status: "CANCELLED", code: null, message: null };
      return { status: "WAIT", code: null, message: null };
    },

    async cancel(providerOrderId: string) {
      await call({ action: "setStatus", status: "8", id: providerOrderId }).catch(() => undefined);
    },

    async getBalance() {
      try {
        const text = await call({ action: "getBalance" });
        if (text.startsWith("ACCESS_BALANCE:")) return Number(text.split(":")[1]);
        return null;
      } catch {
        return null;
      }
    },

    /** Live SA-compatible prices (Grizzly/SMS-Activate). Costs are USD on Grizzly since 2025-09. */
    async getPrices(countryCode?: string): Promise<ProviderPriceRow[]> {
      const iso = (countryCode ?? "US").toUpperCase();
      const country = SA_COUNTRY[iso];
      if (!country) return [];
      try {
        // Prefer country-scoped; fall back to full table if empty/unparseable
        let text = await call({ action: "getPrices", country });
        if (!text || text.startsWith("BAD") || text.startsWith("ERROR") || text.startsWith("NO_")) {
          text = await call({ action: "getPrices" });
        }
        if (!text || text.startsWith("BAD") || text.startsWith("ERROR")) return [];
        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch {
          return [];
        }

        const serviceMap = extractSaServicePriceMap(json, String(country));
        if (!serviceMap) return [];

        const slugByCode = new Map(
          Object.entries(SA_SERVICE).map(([slug, code]) => [code.toLowerCase(), slug]),
        );
        const rows: ProviderPriceRow[] = [];
        for (const [code, info] of Object.entries(serviceMap)) {
          const slug = slugByCode.get(String(code).toLowerCase());
          if (!slug || !info || typeof info !== "object") continue;
          const cost = cellWholesale(info);
          if (!(cost > 0)) continue;
          const count = Number(info.count ?? 0);
          rows.push({
            countryCode: iso,
            serviceSlug: slug,
            wholesale: cost,
            available: count > 0,
            stock: Number.isFinite(count) ? count : 0,
          });
        }
        return rows;
      } catch {
        return [];
      }
    },
  };
}
