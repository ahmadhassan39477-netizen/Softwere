/**
 * SMS wholesale adapters: mock (default), 5SIM, SMS-Activate.
 * Never log API keys.
 */

export type PurchaseResult = {
  providerOrderId: string;
  phoneNumber: string;
  providerKey: string;
};

export type OtpResult = {
  code: string | null;
  message: string | null;
  status: "WAIT" | "RECEIVED" | "CANCELLED" | "EXPIRED";
};

export interface SmsProvider {
  key: string;
  purchase(input: {
    countryCode: string;
    serviceSlug: string;
    server: number;
  }): Promise<PurchaseResult>;
  getOtp(providerOrderId: string): Promise<OtpResult>;
  cancel(providerOrderId: string): Promise<void>;
}

const mockOrders = new Map<
  string,
  { phone: string; createdAt: number; delivered: boolean; code?: string }
>();

function randomPhone(countryCode: string): string {
  const prefixes: Record<string, string> = {
    US: "+1555",
    GB: "+4477",
    NG: "+23480",
    IN: "+9198",
    DE: "+4915",
    FR: "+336",
    BR: "+5511",
    ID: "+6281",
    PH: "+6391",
    RU: "+7900",
  };
  const prefix = prefixes[countryCode] ?? "+1000";
  const rest = String(Math.floor(Math.random() * 1e7)).padStart(7, "0");
  return `${prefix}${rest}`;
}

/** SMS-Activate service letter codes */
const SA_SERVICE: Record<string, string> = {
  whatsapp: "wa",
  telegram: "tg",
  google: "go",
  openai: "dr",
  tinder: "oi",
  binance: "hw",
  facebook: "fb",
  tiktok: "lf",
  discord: "ds",
  twitter: "tw",
  instagram: "ig",
  uber: "ub",
};

/** SMS-Activate numeric country ids */
const SA_COUNTRY: Record<string, string> = {
  US: "12",
  GB: "16",
  NG: "19",
  IN: "22",
  DE: "43",
  FR: "78",
  BR: "73",
  ID: "6",
  PH: "4",
  RU: "0",
};

/** 5SIM product / country names */
const FIVESIM_PRODUCT: Record<string, string> = {
  whatsapp: "whatsapp",
  telegram: "telegram",
  google: "google",
  openai: "openai",
  tinder: "tinder",
  binance: "binance",
  facebook: "facebook",
  tiktok: "tiktok",
  discord: "discord",
  twitter: "twitter",
  instagram: "instagram",
  uber: "uber",
};

const FIVESIM_COUNTRY: Record<string, string> = {
  US: "usa",
  GB: "england",
  NG: "nigeria",
  IN: "india",
  DE: "germany",
  FR: "france",
  BR: "brazil",
  ID: "indonesia",
  PH: "philippines",
  RU: "russia",
};

export const mockSmsProvider: SmsProvider = {
  key: "mock",
  async purchase({ countryCode }) {
    const providerOrderId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const phoneNumber = randomPhone(countryCode);
    mockOrders.set(providerOrderId, {
      phone: phoneNumber,
      createdAt: Date.now(),
      delivered: false,
    });
    return { providerOrderId, phoneNumber, providerKey: "mock" };
  },

  async getOtp(providerOrderId) {
    const order = mockOrders.get(providerOrderId);
    if (!order) return { code: null, message: null, status: "EXPIRED" };

    const elapsed = Date.now() - order.createdAt;
    if (!order.delivered && elapsed > 8_000) {
      order.delivered = true;
      order.code = String(Math.floor(100000 + Math.random() * 900000));
      mockOrders.set(providerOrderId, order);
    }

    if (order.delivered && order.code) {
      return {
        code: order.code,
        message: `Your verification code is ${order.code}`,
        status: "RECEIVED",
      };
    }
    return { code: null, message: null, status: "WAIT" };
  },

  async cancel(providerOrderId) {
    mockOrders.delete(providerOrderId);
  },
};

export const fiveSimProvider: SmsProvider = {
  key: "5sim",
  async purchase({ countryCode, serviceSlug }) {
    const key = process.env.FIVESIM_API_KEY?.trim();
    if (!key) throw new Error("FIVESIM_API_KEY not configured");

    const country = FIVESIM_COUNTRY[countryCode.toUpperCase()];
    const product = FIVESIM_PRODUCT[serviceSlug.toLowerCase()];
    if (!country || !product) throw new Error("Unsupported country/service for 5SIM");

    const url = `https://5sim.net/v1/user/buy/activation/${country}/any/${product}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`5SIM purchase failed (${res.status})${text ? `: ${text.slice(0, 120)}` : ""}`);
    }
    const data = (await res.json()) as { id?: number | string; phone?: string };
    if (!data.id || !data.phone) throw new Error("5SIM returned incomplete order");
    return {
      providerOrderId: String(data.id),
      phoneNumber: data.phone.startsWith("+") ? data.phone : `+${data.phone}`,
      providerKey: "5sim",
    };
  },

  async getOtp(providerOrderId) {
    const key = process.env.FIVESIM_API_KEY?.trim();
    if (!key) throw new Error("FIVESIM_API_KEY not configured");
    const res = await fetch(`https://5sim.net/v1/user/check/${providerOrderId}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { code: null, message: null, status: "WAIT" };
    const data = (await res.json()) as {
      status?: string;
      sms?: { code?: string; text?: string }[];
    };
    const sms = data.sms?.[0];
    if (sms?.code) {
      return { code: sms.code, message: sms.text ?? null, status: "RECEIVED" };
    }
    if (data.status === "CANCELED" || data.status === "TIMEOUT") {
      return { code: null, message: null, status: "EXPIRED" };
    }
    return { code: null, message: null, status: "WAIT" };
  },

  async cancel(providerOrderId) {
    const key = process.env.FIVESIM_API_KEY?.trim();
    if (!key) return;
    await fetch(`https://5sim.net/v1/user/cancel/${providerOrderId}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    }).catch(() => undefined);
  },
};

export const smsActivateProvider: SmsProvider = {
  key: "sms-activate",
  async purchase({ countryCode, serviceSlug }) {
    const key = process.env.SMS_ACTIVATE_API_KEY?.trim();
    if (!key) throw new Error("SMS_ACTIVATE_API_KEY not configured");

    const service = SA_SERVICE[serviceSlug.toLowerCase()];
    const country = SA_COUNTRY[countryCode.toUpperCase()];
    if (!service || !country) throw new Error("Unsupported country/service for SMS-Activate");

    const url = new URL("https://api.sms-activate.org/stubs/handler_api.php");
    url.searchParams.set("api_key", key);
    url.searchParams.set("action", "getNumber");
    url.searchParams.set("service", service);
    url.searchParams.set("country", country);

    const res = await fetch(url.toString(), { cache: "no-store" });
    const text = await res.text();
    // ACCESS_NUMBER:id:phone
    if (!text.startsWith("ACCESS_NUMBER:")) {
      throw new Error(`SMS-Activate purchase failed: ${text.slice(0, 80)}`);
    }
    const [, id, phone] = text.trim().split(":");
    if (!id || !phone) throw new Error("SMS-Activate returned incomplete order");
    return {
      providerOrderId: id,
      phoneNumber: phone.startsWith("+") ? phone : `+${phone}`,
      providerKey: "sms-activate",
    };
  },

  async getOtp(providerOrderId) {
    const key = process.env.SMS_ACTIVATE_API_KEY?.trim();
    if (!key) throw new Error("SMS_ACTIVATE_API_KEY not configured");
    const url = new URL("https://api.sms-activate.org/stubs/handler_api.php");
    url.searchParams.set("api_key", key);
    url.searchParams.set("action", "getStatus");
    url.searchParams.set("id", providerOrderId);
    const res = await fetch(url.toString(), { cache: "no-store" });
    const text = await res.text();
    if (text.startsWith("STATUS_OK:")) {
      const code = text.slice("STATUS_OK:".length).trim();
      return { code, message: `Your verification code is ${code}`, status: "RECEIVED" };
    }
    if (text.includes("STATUS_CANCEL") || text.includes("STATUS_WAIT_RETRY")) {
      return { code: null, message: null, status: text.includes("CANCEL") ? "CANCELLED" : "WAIT" };
    }
    return { code: null, message: null, status: "WAIT" };
  },

  async cancel(providerOrderId) {
    const key = process.env.SMS_ACTIVATE_API_KEY?.trim();
    if (!key) return;
    const url = new URL("https://api.sms-activate.org/stubs/handler_api.php");
    url.searchParams.set("api_key", key);
    url.searchParams.set("action", "setStatus");
    url.searchParams.set("status", "8");
    url.searchParams.set("id", providerOrderId);
    await fetch(url.toString(), { cache: "no-store" }).catch(() => undefined);
  },
};

function mocksEnabled() {
  return process.env.USE_MOCK_PROVIDERS !== "false";
}

export function providerForKey(providerKey: string): SmsProvider {
  if (mocksEnabled() || providerKey === "mock") return mockSmsProvider;
  if (providerKey === "5sim") return fiveSimProvider;
  if (providerKey === "sms-activate") return smsActivateProvider;
  return mockSmsProvider;
}

export function getSmsProvider(providerKey = "mock"): SmsProvider {
  return providerForKey(providerKey);
}

/**
 * Try 5SIM → SMS-Activate → mock (if mocks allowed or keys missing).
 */
export async function purchaseWithFallback(input: {
  countryCode: string;
  serviceSlug: string;
  server: number;
}): Promise<PurchaseResult> {
  if (mocksEnabled()) {
    return mockSmsProvider.purchase(input);
  }

  const errors: string[] = [];

  if (process.env.FIVESIM_API_KEY?.trim()) {
    try {
      return await fiveSimProvider.purchase(input);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "5SIM failed");
    }
  }

  if (process.env.SMS_ACTIVATE_API_KEY?.trim()) {
    try {
      return await smsActivateProvider.purchase(input);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "SMS-Activate failed");
    }
  }

  // Soft fallback so production without keys still demos
  if (!process.env.FIVESIM_API_KEY?.trim() && !process.env.SMS_ACTIVATE_API_KEY?.trim()) {
    return mockSmsProvider.purchase(input);
  }

  throw new Error(errors.join(" | ") || "No SMS provider available");
}
