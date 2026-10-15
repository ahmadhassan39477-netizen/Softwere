import {
  BuyInput,
  BuyResult,
  ProviderBalanceError,
  ProviderNoStockError,
  SmsAdapter,
  SmsStatus,
} from "../types";
import { SA_COUNTRY, SA_SERVICE } from "../service-map";

/** Grizzly SMS — SMS-Activate–compatible handler API. */
function baseUrl() {
  return (
    process.env.GRIZZLY_SMS_BASE_URL?.trim() ||
    "https://api.grizzlysms.com/stubs/handler_api.php"
  );
}

export function createGrizzlySmsAdapter(apiKey: string): SmsAdapter {
  async function call(params: Record<string, string>) {
    const url = new URL(baseUrl());
    url.searchParams.set("api_key", apiKey);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { cache: "no-store" });
    return (await res.text()).trim();
  }

  return {
    key: "grizzlysms",
    displayName: "Grizzly SMS",

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
      return {
        providerKey: "grizzlysms",
        providerOrderId: id,
        phoneNumber: phone.startsWith("+") ? phone : `+${phone}`,
        wholesaleCost: 0,
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
  };
}
