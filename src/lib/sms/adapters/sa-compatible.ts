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
import {
  parseActiveActivationSms,
  parseSaGetStatusText,
  parseSaGetStatusV2Json,
} from "../sa-status";
import { isPlausibleOtpWholesale } from "../otp-price-guards";
import { extractSaMultiOffers, extractSaServicePriceMap } from "../sa-multi-prices";

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

export { extractSaServicePriceMap } from "../sa-multi-prices";

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

  function slugByCodeMap() {
    return new Map(
      Object.entries(SA_SERVICE).map(([slug, code]) => [code.toLowerCase(), slug]),
    );
  }

  async function fetchPriceJson(
    action: string,
    country: string,
    service?: string,
  ): Promise<unknown | null> {
    const params: Record<string, string> = { action, country };
    if (service) params.service = service;
    const text = await call(params);
    if (!text || text.startsWith("BAD") || text.startsWith("ERROR") || text.startsWith("NO_")) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  return {
    key: providerKey,
    displayName,

    async buy(input: BuyInput): Promise<BuyResult> {
      const service = SA_SERVICE[input.serviceSlug.toLowerCase()];
      const country = SA_COUNTRY[input.countryCode.toUpperCase()];
      if (!service || !country) throw new ProviderNoStockError("UNSUPPORTED_ROUTE");

      const params: Record<string, string> = { action: "getNumber", service, country };
      const { isPlausibleOtpWholesale } = await import("../otp-price-guards");
      if (
        input.maxPrice != null &&
        Number(input.maxPrice) > 0 &&
        isPlausibleOtpWholesale(Number(input.maxPrice))
      ) {
        params.maxPrice = String(input.maxPrice);
      }
      // Prefer explicit providerIds; else treat operator as provider id when numeric / non-tier
      const providerIds =
        input.providerIds?.trim() ||
        (input.operator && !input.operator.startsWith("tier:")
          ? input.operator.trim()
          : "");
      if (providerIds) params.providerIds = providerIds;
      if (input.operator?.startsWith("tier:") && !params.maxPrice) {
        const tier = Number(input.operator.slice(5));
        // Only true USD tiers — never provider ids mislabeled as tier:1015
        if (tier > 0 && isPlausibleOtpWholesale(tier)) {
          params.maxPrice = String(tier);
        }
      }

      const text = await call(params);
      if (text === "NO_NUMBERS" || text === "NO_NUMBER") throw new ProviderNoStockError(text);
      if (text === "NO_BALANCE") throw new ProviderBalanceError(text);
      if (!text.startsWith("ACCESS_NUMBER:")) throw new Error(text.slice(0, 120) || "buy_failed");

      const [, id, phone] = text.split(":");
      if (!id || !phone) throw new Error("incomplete_response");

      // Mark activation ready for SMS (Grizzly/SA) — ignore failures
      await call({ action: "setStatus", status: "1", id }).catch(() => undefined);

      // Best-effort wholesale for retail charge (never throws)
      let wholesaleCost = Number(input.maxPrice ?? 0);
      if (!(wholesaleCost > 0)) {
        try {
          const priceText = await call({ action: "getPrices", country, service });
          const priceJson = priceText ? JSON.parse(priceText) : null;
          const map = extractSaServicePriceMap(priceJson, String(country));
          const cell = map?.[service];
          if (cell) wholesaleCost = cellWholesale(cell);
        } catch {
          wholesaleCost = 0;
        }
      }

      return {
        providerKey,
        providerOrderId: id,
        phoneNumber: phone.startsWith("+") ? phone : `+${phone}`,
        wholesaleCost,
        operator: input.operator,
        networkLabel: input.networkLabel,
      };
    },

    async checkSMS(providerOrderId: string): Promise<SmsStatus> {
      // 1) Classic getStatus text protocol
      try {
        const text = await call({ action: "getStatus", id: providerOrderId });
        const parsed = parseSaGetStatusText(text);
        if (parsed.status === "RECEIVED" || parsed.status === "CANCELLED") return parsed;
      } catch {
        /* fall through */
      }

      // 2) Grizzly getStatusV2 JSON (sms.code / sms.text)
      try {
        const v2text = await call({ action: "getStatusV2", id: providerOrderId });
        if (v2text && !v2text.startsWith("BAD") && !v2text.startsWith("NO_")) {
          try {
            const v2 = parseSaGetStatusV2Json(JSON.parse(v2text));
            if (v2?.status === "RECEIVED") return v2;
            if (v2?.status === "CANCELLED") return v2;
          } catch {
            /* ignore bad JSON */
          }
        }
      } catch {
        /* fall through */
      }

      // 3) Active activations list — sometimes SMS lands here first
      try {
        const listText = await call({ action: "getActiveActivations" });
        if (listText && (listText.startsWith("{") || listText.startsWith("["))) {
          try {
            const hit = parseActiveActivationSms(JSON.parse(listText), providerOrderId);
            if (hit?.status === "RECEIVED") return hit;
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }

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

    /**
     * Live SA-compatible prices (Grizzly/SMS-Activate).
     * Tries getPricesV3 → V2 → V1 so multi price/provider rows surface when available.
     */
    async getPrices(countryCode?: string): Promise<ProviderPriceRow[]> {
      const iso = (countryCode ?? "US").toUpperCase();
      const country = SA_COUNTRY[iso];
      if (!country) return [];
      const ctx = {
        countryCode: iso,
        countryId: String(country),
        slugByCode: slugByCodeMap(),
      };

      try {
        for (const action of ["getPricesV3", "getPricesV2", "getPrices"] as const) {
          let json = await fetchPriceJson(action, String(country));
          if (!json) {
            // Country-wide empty — try without filter once on V1 only
            if (action === "getPrices") {
              const text = await call({ action: "getPrices" });
              if (text && !text.startsWith("BAD") && !text.startsWith("ERROR")) {
                try {
                  json = JSON.parse(text);
                } catch {
                  json = null;
                }
              }
            }
          }
          if (!json) continue;
          const multi = extractSaMultiOffers(json, ctx);
          if (multi.length > 0) return multi;

          // Classic flat fallback for this payload
          const serviceMap = extractSaServicePriceMap(json, String(country));
          if (!serviceMap) continue;
          const rows: ProviderPriceRow[] = [];
          for (const [code, info] of Object.entries(serviceMap)) {
            const slug = ctx.slugByCode.get(String(code).toLowerCase());
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
              networkLabel: "Any network",
              offerKey: `${slug}::${cost.toFixed(4)}`,
            });
          }
          if (rows.length > 0) return rows;
        }
        return [];
      } catch {
        return [];
      }
    },
  };
}
