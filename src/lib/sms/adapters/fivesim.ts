import {
  BuyInput,
  BuyResult,
  ProviderBalanceError,
  ProviderNoStockError,
  ProviderPriceRow,
  SmsAdapter,
  SmsStatus,
} from "../types";
import { FIVESIM_COUNTRY, FIVESIM_PRODUCT } from "../service-map";

const USER_API = "https://5sim.net/v1/user";
const GUEST_API = "https://5sim.net/v1/guest";

/** Probe a 5SIM profile API key via /user/profile — never logs the key. */
export async function probeFiveSimApiKey(
  apiKey: string,
): Promise<{ ok: boolean; balance: number | null; error?: string }> {
  const key = apiKey.trim();
  if (!key || key === "guest") {
    return { ok: false, balance: null, error: "Paste a 5SIM API key from profile/settings." };
  }
  try {
    const res = await fetch(`${USER_API}/profile`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${key}`,
        "User-Agent": "TempEmpire/1.0 (+https://www.tempempire.store)",
      },
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* plain */
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        balance: null,
        error:
          "5SIM rejected this key. Copy the API key from the same 5sim.net account you topped up.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        balance: null,
        error: "Could not verify this 5SIM key. Try again in a moment.",
      };
    }
    const bal = (json as { balance?: number } | null)?.balance;
    return {
      ok: true,
      balance: typeof bal === "number" ? bal : null,
    };
  } catch {
    return { ok: false, balance: null, error: "Could not reach 5SIM to verify this key." };
  }
}

export function createFiveSimAdapter(apiKey: string): SmsAdapter {
  async function api(base: string, path: string, init?: RequestInit) {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "TempEmpire/1.0 (+https://www.tempempire.store)",
      ...(init?.headers as Record<string, string> | undefined),
    };
    // Guest catalog is public — do not send a fake Bearer (e.g. "guest")
    const isGuest = base.includes("/guest");
    if (!isGuest && apiKey && apiKey !== "guest") {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* plain */
    }
    return { ok: res.ok, status: res.status, text, json };
  }

  return {
    key: "5sim",
    displayName: "5SIM",

    async buy(input: BuyInput): Promise<BuyResult> {
      const country = FIVESIM_COUNTRY[input.countryCode.toUpperCase()];
      const product = FIVESIM_PRODUCT[input.serviceSlug.toLowerCase()];
      if (!country || !product) throw new ProviderNoStockError("UNSUPPORTED_ROUTE");

      const { ok, status, text, json } = await api(
        USER_API,
        `/buy/activation/${country}/any/${product}`,
      );
      if (status === 400 || /no free|not enough|no numbers/i.test(text)) {
        throw new ProviderNoStockError(text.slice(0, 80) || "NO_NUMBERS");
      }
      if (status === 402 || /balance/i.test(text)) throw new ProviderBalanceError("NO_BALANCE");
      if (!ok) throw new Error(text.slice(0, 120) || `http_${status}`);

      const data = json as { id?: number | string; phone?: string; price?: number };
      if (!data?.id || !data?.phone) throw new Error("incomplete_response");
      return {
        providerKey: "5sim",
        providerOrderId: String(data.id),
        phoneNumber: data.phone.startsWith("+") ? data.phone : `+${data.phone}`,
        wholesaleCost: Number(data.price ?? 0),
      };
    },

    async checkSMS(providerOrderId: string): Promise<SmsStatus> {
      const { ok, json } = await api(USER_API, `/check/${providerOrderId}`);
      if (!ok || !json) return { status: "WAIT", code: null, message: null };
      const data = json as { status?: string; sms?: { code?: string; text?: string }[] };
      const sms = data.sms?.[0];
      if (sms?.code) {
        return {
          status: "RECEIVED",
          code: sms.code,
          message: sms.text ?? `Your verification code is ${sms.code}`,
        };
      }
      if (data.status === "CANCELED" || data.status === "TIMEOUT") {
        return { status: "EXPIRED", code: null, message: null };
      }
      return { status: "WAIT", code: null, message: null };
    },

    async cancel(providerOrderId: string) {
      await api(USER_API, `/cancel/${providerOrderId}`).catch(() => undefined);
    },

    async getBalance() {
      try {
        const { ok, json } = await api(USER_API, "/profile");
        if (!ok || !json) return null;
        const bal = (json as { balance?: number }).balance;
        return typeof bal === "number" ? bal : null;
      } catch {
        return null;
      }
    },

    /**
     * Live product qty/price for one ISO country.
     * Uses public guest /products (stock ≠ wallet balance). Deposit on 5sim.net
     * only adds credit for buy — it does not change Qty here.
     */
    async getPrices(countryCode?: string): Promise<ProviderPriceRow[]> {
      const iso = (countryCode ?? "US").toUpperCase();
      const country = FIVESIM_COUNTRY[iso];
      if (!country) return [];
      try {
        const { ok, json } = await api(GUEST_API, `/products/${country}/any`);
        if (!ok || !json || typeof json !== "object") return [];
        const slugByProduct = new Map(
          Object.entries(FIVESIM_PRODUCT).map(([slug, product]) => [
            product.toLowerCase(),
            slug,
          ]),
        );
        const rows: ProviderPriceRow[] = [];
        for (const [product, info] of Object.entries(
          json as Record<
            string,
            { Qty?: number; Price?: number; Category?: string }
          >,
        )) {
          const slug = slugByProduct.get(product.toLowerCase());
          if (!slug) continue;
          const category = String(info?.Category ?? "activation").toLowerCase();
          if (category && category !== "activation") continue;
          const qty = Number(info?.Qty ?? 0);
          const price = Number(info?.Price ?? 0);
          rows.push({
            countryCode: iso,
            serviceSlug: slug,
            wholesale: Number.isFinite(price) ? price : 0,
            available: qty > 0,
            stock: Number.isFinite(qty) ? qty : 0,
          });
        }
        return rows;
      } catch {
        return [];
      }
    },
  };
}
