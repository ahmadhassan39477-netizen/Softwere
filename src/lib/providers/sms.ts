/**
 * SMS wholesale adapter. USE_MOCK_PROVIDERS=true uses the mock implementation.
 */

export type PurchaseResult = {
  providerOrderId: string;
  phoneNumber: string;
};

export type OtpResult = {
  code: string | null;
  message: string | null;
  status: "WAIT" | "RECEIVED" | "CANCELLED" | "EXPIRED";
};

export interface SmsProvider {
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

export const mockSmsProvider: SmsProvider = {
  async purchase({ countryCode }) {
    const providerOrderId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const phoneNumber = randomPhone(countryCode);
    mockOrders.set(providerOrderId, {
      phone: phoneNumber,
      createdAt: Date.now(),
      delivered: false,
    });
    return { providerOrderId, phoneNumber };
  },

  async getOtp(providerOrderId) {
    const order = mockOrders.get(providerOrderId);
    if (!order) return { code: null, message: null, status: "EXPIRED" };

    // Deliver a mock OTP ~8–15s after purchase for demo UX
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

/** Stub for live SMS-Activate — reads env, throws if not configured. */
export const smsActivateProvider: SmsProvider = {
  async purchase() {
    const key = process.env.SMS_ACTIVATE_API_KEY;
    if (!key) throw new Error("SMS_ACTIVATE_API_KEY not configured");
    throw new Error("Live SMS-Activate adapter not enabled — set USE_MOCK_PROVIDERS=true");
  },
  async getOtp() {
    throw new Error("Live SMS-Activate adapter not enabled");
  },
  async cancel() {
    throw new Error("Live SMS-Activate adapter not enabled");
  },
};

export function getSmsProvider(providerKey = "mock"): SmsProvider {
  if (process.env.USE_MOCK_PROVIDERS !== "false") return mockSmsProvider;
  if (providerKey === "sms-activate") return smsActivateProvider;
  return mockSmsProvider;
}
