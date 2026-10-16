import {
  BuyInput,
  BuyResult,
  ProviderBalanceError,
  ProviderNoStockError,
  ProviderPriceRow,
  SmsAdapter,
  SmsStatus,
} from "../types";
import { SA_COUNTRY, SA_SERVICE } from "../service-map";

const CONTROL_BASE = "https://api.sms-man.com/control";

type SmsManError = {
  success?: boolean;
  error_code?: string;
  error_msg?: string | Record<string, string>;
};

type ServiceRow = { id: string | number; name?: string; code?: string };
type CountryRow = { id: number | string; title?: string };

/** Reject docs URLs / get-sms templates pasted as if they were tokens. */
export function isSmsManDocsUrl(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (v.includes("api.sms-man.com")) return true;
  if (v.includes("get-sms") || v.includes("get-number") || v.includes("request_id=")) {
    return true;
  }
  return false;
}

function errorMessage(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") return fallback;
  const e = json as SmsManError;
  if (typeof e.error_msg === "string") return e.error_msg;
  if (e.error_msg && typeof e.error_msg === "object") {
    return Object.values(e.error_msg).join("; ") || fallback;
  }
  if (e.error_code) return e.error_code;
  return fallback;
}

export function createSmsManAdapter(token: string): SmsAdapter {
  const apiToken = token.trim();

  let servicesCache: ServiceRow[] | null = null;
  let countriesCache: CountryRow[] | null = null;

  function assertToken() {
    if (!apiToken || isSmsManDocsUrl(apiToken)) {
      throw new Error(
        "SMS_MAN_INVALID_TOKEN — paste the SMS-Man profile token, not a get-sms docs URL",
      );
    }
  }

  async function control(
    path: string,
    params: Record<string, string | number | undefined> = {},
  ): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
    assertToken();
    const url = new URL(`${CONTROL_BASE}/${path.replace(/^\//, "")}`);
    url.searchParams.set("token", apiToken);
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* plain */
    }
    return { ok: res.ok, status: res.status, json, text };
  }

  async function loadServices(): Promise<ServiceRow[]> {
    if (servicesCache) return servicesCache;
    // Official control API: get-applications (service list with id + code)
    for (const path of ["get-applications", "applications", "get-services"] as const) {
      const { json } = await control(path);
      if (Array.isArray(json)) {
        servicesCache = json as ServiceRow[];
        return servicesCache;
      }
    }
    servicesCache = [];
    return servicesCache;
  }

  async function loadCountries(): Promise<CountryRow[]> {
    if (countriesCache) return countriesCache;
    for (const path of ["get-countries", "countries"] as const) {
      const { json } = await control(path);
      if (Array.isArray(json)) {
        countriesCache = json as CountryRow[];
        return countriesCache;
      }
    }
    countriesCache = [];
    return countriesCache;
  }

  async function resolveApplicationId(serviceSlug: string): Promise<string | null> {
    const code = SA_SERVICE[serviceSlug.toLowerCase()];
    if (!code) return null;
    const services = await loadServices();
    const match = services.find(
      (s) => String(s.code ?? "").toLowerCase() === code.toLowerCase(),
    );
    if (match?.id != null) return String(match.id);
    // Fallback: some catalogs use slug-like names
    const byName = services.find(
      (s) => String(s.name ?? "").toLowerCase() === serviceSlug.toLowerCase(),
    );
    return byName?.id != null ? String(byName.id) : null;
  }

  async function resolveCountryId(iso: string): Promise<string | null> {
    // SMS-Man country ids align with SMS-Activate for the common set (RU=0, CN=3, …).
    const sa = SA_COUNTRY[iso.toUpperCase()];
    if (sa != null) return sa;
    const countries = await loadCountries();
    const titleHints: Record<string, string[]> = {
      US: ["usa", "united states", "america"],
      GB: ["england", "united kingdom", "uk"],
    };
    const hints = titleHints[iso.toUpperCase()] ?? [];
    const match = countries.find((c) => {
      const t = String(c.title ?? "").toLowerCase();
      return hints.some((h) => t.includes(h));
    });
    return match?.id != null ? String(match.id) : null;
  }

  return {
    key: "sms-man",
    displayName: "SMS-Man",

    async buy(input: BuyInput): Promise<BuyResult> {
      const iso = input.countryCode.toUpperCase();
      const applicationId = await resolveApplicationId(input.serviceSlug);
      const countryId = await resolveCountryId(iso);
      if (!applicationId || countryId == null) {
        throw new ProviderNoStockError("UNSUPPORTED_ROUTE");
      }

      const { ok, status, json, text } = await control("get-number", {
        country_id: countryId,
        application_id: applicationId,
        currency: "USD",
      });

      const errCode =
        json && typeof json === "object"
          ? String((json as SmsManError).error_code ?? "")
          : "";
      const errText = errorMessage(json, text);

      if (/wrong_token|invalid.?token/i.test(errCode + errText)) {
        throw new Error("SMS_MAN_WRONG_TOKEN");
      }
      if (
        /no.?number|out.?of.?stock|not.?enough|no_free|empty/i.test(errCode + errText) ||
        status === 404
      ) {
        throw new ProviderNoStockError(errText.slice(0, 80) || "NO_NUMBERS");
      }
      if (/balance|money|funds/i.test(errCode + errText) || status === 402) {
        throw new ProviderBalanceError("NO_BALANCE");
      }
      if (!ok && (json as SmsManError)?.success === false) {
        throw new ProviderNoStockError(errText.slice(0, 80) || "NO_NUMBERS");
      }

      const data = json as {
        request_id?: number | string;
        number?: string;
        cost?: string | number;
      };
      if (!data?.request_id || !data?.number) {
        throw new Error(errText.slice(0, 120) || "incomplete_response");
      }

      let wholesale = Number(data.cost ?? NaN);
      if (!Number.isFinite(wholesale)) {
        try {
          const prices = await control("get-prices", { country_id: countryId });
          const tree = prices.json as
            | Record<string, Record<string, { cost?: string; count?: string | number }>>
            | null;
          const row = tree?.[String(countryId)]?.[String(applicationId)];
          wholesale = Number(row?.cost ?? 0);
        } catch {
          wholesale = 0;
        }
      }

      const phone = String(data.number);
      return {
        providerKey: "sms-man",
        providerOrderId: String(data.request_id),
        phoneNumber: phone.startsWith("+") ? phone : `+${phone}`,
        wholesaleCost: Number.isFinite(wholesale) ? wholesale : 0,
      };
    },

    async checkSMS(providerOrderId: string): Promise<SmsStatus> {
      const { json } = await control("get-sms", { request_id: providerOrderId });
      if (!json || typeof json !== "object") {
        return { status: "WAIT", code: null, message: null };
      }
      const data = json as SmsManError & { sms_code?: string; number?: string };
      if (data.sms_code) {
        const code = String(data.sms_code);
        return {
          status: "RECEIVED",
          code,
          message: `Your verification code is ${code}`,
        };
      }
      if (data.error_code === "wait_sms") {
        return { status: "WAIT", code: null, message: null };
      }
      if (
        /cancel|reject|expire|close|used/i.test(String(data.error_code ?? data.error_msg ?? ""))
      ) {
        return { status: "EXPIRED", code: null, message: null };
      }
      return { status: "WAIT", code: null, message: null };
    },

    async cancel(providerOrderId: string) {
      // reject = cancel unused number; close = finish after SMS
      await control("set-status", {
        request_id: providerOrderId,
        status: "reject",
      }).catch(() => undefined);
    },

    async getBalance() {
      try {
        const { ok, json } = await control("get-balance");
        if (!ok || !json || typeof json !== "object") return null;
        const bal = Number((json as { balance?: string | number }).balance);
        return Number.isFinite(bal) ? bal : null;
      } catch {
        return null;
      }
    },

    async getPrices(countryCode?: string): Promise<ProviderPriceRow[]> {
      const iso = (countryCode ?? "US").toUpperCase();
      const countryId = await resolveCountryId(iso);
      if (countryId == null) return [];
      try {
        const services = await loadServices();
        const slugByAppId = new Map<string, string>();
        for (const [slug, code] of Object.entries(SA_SERVICE)) {
          const svc = services.find(
            (s) => String(s.code ?? "").toLowerCase() === code.toLowerCase(),
          );
          if (svc?.id != null) slugByAppId.set(String(svc.id), slug);
        }

        const { json } = await control("get-prices", { country_id: countryId });
        if (!json || typeof json !== "object") return [];
        const tree = json as Record<
          string,
          Record<string, { cost?: string; count?: string | number }>
        >;
        const countryTree = tree[String(countryId)] ?? tree;
        const rows: ProviderPriceRow[] = [];
        for (const [appId, info] of Object.entries(countryTree)) {
          const slug = slugByAppId.get(String(appId));
          if (!slug || !info || typeof info !== "object") continue;
          const cost = Number(info.cost ?? 0);
          const count = Number(info.count ?? 0);
          rows.push({
            countryCode: iso,
            serviceSlug: slug,
            wholesale: Number.isFinite(cost) ? cost : 0,
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
