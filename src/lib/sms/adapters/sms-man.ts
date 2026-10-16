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
type PriceCell = { cost?: string | number; count?: string | number };

/** Reject docs URLs / get-sms templates pasted as if they were tokens. */
export function isSmsManDocsUrl(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (v.includes("api.sms-man.com")) return true;
  if (v.includes("get-sms") || v.includes("get-number") || v.includes("request_id=")) {
    return true;
  }
  // Docs placeholders like $token / {token}
  if (/\$token|\{token\}|%\w*token/i.test(v)) return true;
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

function isPriceCell(v: unknown): v is PriceCell {
  return Boolean(v && typeof v === "object" && ("cost" in v || "count" in v));
}

/** True when obj looks like { applicationId: { cost, count } }. */
function isApplicationPriceMap(obj: unknown): obj is Record<string, PriceCell> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const vals = Object.values(obj as Record<string, unknown>);
  if (vals.length === 0) return false;
  // Error payloads
  if ("error_code" in (obj as object) || "success" in (obj as object)) return false;
  return vals.every(isPriceCell);
}

/**
 * SMS-Man get-prices may return:
 * - { [countryId]: { [applicationId]: { cost, count } } }
 * - { [applicationId]: { cost, count } } when country_id is filtered
 */
export function extractAppPriceMap(
  json: unknown,
  countryId: string,
): Record<string, PriceCell> | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const tree = json as Record<string, unknown>;
  if (tree.success === false || tree.error_code) return null;

  const direct = tree[String(countryId)];
  if (isApplicationPriceMap(direct)) return direct;

  if (isApplicationPriceMap(tree)) return tree;

  // Sometimes numeric keys are numbers in JSON already stringified by parse
  for (const [k, v] of Object.entries(tree)) {
    if (String(k) === String(countryId) && isApplicationPriceMap(v)) {
      return v;
    }
  }
  return null;
}

/** Probe balance with a token — never logs the token. */
export async function probeSmsManToken(
  token: string,
): Promise<{ ok: boolean; error?: string; balance?: number | null }> {
  const t = token.trim();
  if (!t || isSmsManDocsUrl(t)) {
    return {
      ok: false,
      error:
        "Paste the SMS-Man profile token from sms-man.com (Account), not a get-sms docs URL.",
    };
  }
  try {
    const url = new URL(`${CONTROL_BASE}/get-balance`);
    url.searchParams.set("token", t);
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      return { ok: false, error: "SMS-Man did not return JSON for get-balance." };
    }
    if (json && typeof json === "object" && (json as SmsManError).success === false) {
      const code = String((json as SmsManError).error_code ?? "");
      if (/wrong_token/i.test(code)) {
        return { ok: false, error: "SMS-Man rejected this token (wrong_token)." };
      }
      return { ok: false, error: errorMessage(json, "SMS-Man token check failed.") };
    }
    const bal = Number((json as { balance?: string | number } | null)?.balance);
    return { ok: true, balance: Number.isFinite(bal) ? bal : null };
  } catch {
    return { ok: false, error: "Could not reach SMS-Man get-balance." };
  }
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
      /* plain / HTML 404 */
    }
    return { ok: res.ok, status: res.status, json, text };
  }

  async function loadServices(): Promise<ServiceRow[]> {
    if (servicesCache) return servicesCache;
    // Live paths on api.sms-man.com/control (get-applications 404s)
    for (const path of ["applications", "get-services"] as const) {
      const { json, status } = await control(path);
      if (Array.isArray(json)) {
        servicesCache = json as ServiceRow[];
        return servicesCache;
      }
      if (status === 404) continue;
    }
    servicesCache = [];
    return servicesCache;
  }

  async function loadCountries(): Promise<CountryRow[]> {
    if (countriesCache) return countriesCache;
    // Live path is `countries` (get-countries 404s)
    for (const path of ["countries", "get-countries"] as const) {
      const { json, status } = await control(path);
      if (Array.isArray(json)) {
        countriesCache = json as CountryRow[];
        return countriesCache;
      }
      if (status === 404) continue;
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
    const byName = services.find(
      (s) => String(s.name ?? "").toLowerCase() === serviceSlug.toLowerCase(),
    );
    return byName?.id != null ? String(byName.id) : null;
  }

  async function resolveCountryId(iso: string): Promise<string | null> {
    const upper = iso.toUpperCase();
    // Prefer SMS-Man's own country list (IDs are not guaranteed identical to SA for every ISO)
    try {
      const countries = await loadCountries();
      const titleHints: Record<string, string[]> = {
        US: ["usa", "united states", "america"],
        GB: ["england", "united kingdom", "great britain", "uk"],
        RU: ["russia", "russian"],
        CN: ["china"],
        DE: ["germany"],
        FR: ["france"],
        IN: ["india"],
        NG: ["nigeria"],
        PK: ["pakistan"],
        BR: ["brazil"],
        ID: ["indonesia"],
        PH: ["philippines"],
        UA: ["ukraine"],
        TR: ["turkey"],
        NL: ["netherlands"],
        CA: ["canada"],
        AU: ["australia"],
        ES: ["spain"],
        IT: ["italy"],
        PL: ["poland"],
        MX: ["mexico"],
        EG: ["egypt"],
        ZA: ["south africa"],
        KE: ["kenya"],
        JP: ["japan"],
        KR: ["korea"],
      };
      const hints = titleHints[upper] ?? [];
      if (hints.length) {
        const match = countries.find((c) => {
          const t = String(c.title ?? "").toLowerCase();
          return hints.some((h) => t === h || t.includes(h));
        });
        if (match?.id != null) return String(match.id);
      }
    } catch {
      /* fall through */
    }
    const sa = SA_COUNTRY[upper];
    return sa != null ? sa : null;
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
          const appMap = extractAppPriceMap(prices.json, String(countryId));
          wholesale = Number(appMap?.[String(applicationId)]?.cost ?? 0);
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
      await control("set-status", {
        request_id: providerOrderId,
        status: "reject",
      }).catch(() => undefined);
    },

    async getBalance() {
      try {
        const { ok, json } = await control("get-balance");
        if (!ok || !json || typeof json !== "object") return null;
        if ((json as SmsManError).success === false) return null;
        const bal = Number((json as { balance?: string | number }).balance);
        return Number.isFinite(bal) ? bal : null;
      } catch {
        return null;
      }
    },

    async getPrices(countryCode?: string): Promise<ProviderPriceRow[]> {
      const iso = (countryCode ?? "US").toUpperCase();
      try {
        // Parallel: applications list + prices (correct paths; avoid 404 get-* aliases)
        const countryIdPromise = resolveCountryId(iso);
        const servicesPromise = loadServices();
        const countryId = await countryIdPromise;
        if (countryId == null) return [];

        const [{ json: pricesJson }, services] = await Promise.all([
          control("get-prices", { country_id: countryId }),
          servicesPromise,
        ]);

        if (
          pricesJson &&
          typeof pricesJson === "object" &&
          (pricesJson as SmsManError).success === false
        ) {
          return [];
        }

        const appMap = extractAppPriceMap(pricesJson, String(countryId));
        if (!appMap) return [];

        const slugByAppId = new Map<string, string>();
        for (const [slug, code] of Object.entries(SA_SERVICE)) {
          const svc = services.find(
            (s) => String(s.code ?? "").toLowerCase() === code.toLowerCase(),
          );
          if (svc?.id != null) slugByAppId.set(String(svc.id), slug);
        }

        // If applications list failed, try matching by scraping nothing — leave empty
        // rather than inventing slugs. Buy path still uses resolveApplicationId.
        const rows: ProviderPriceRow[] = [];
        for (const [appId, info] of Object.entries(appMap)) {
          const slug = slugByAppId.get(String(appId));
          if (!slug || !info) continue;
          const cost = Number(info.cost ?? 0);
          const count = Number(info.count ?? 0);
          if (!Number.isFinite(cost) || cost <= 0) continue;
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
