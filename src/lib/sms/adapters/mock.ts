import { BuyInput, BuyResult, SmsAdapter, SmsStatus } from "../types";

const orders = new Map<
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
  const prefix = prefixes[countryCode.toUpperCase()] ?? "+1000";
  const rest = String(Math.floor(Math.random() * 1e7)).padStart(7, "0");
  return `${prefix}${rest}`;
}

export const mockAdapter: SmsAdapter = {
  key: "mock",
  displayName: "Mock (demo)",

  async buy(input: BuyInput): Promise<BuyResult> {
    const providerOrderId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const phoneNumber = randomPhone(input.countryCode);
    orders.set(providerOrderId, { phone: phoneNumber, createdAt: Date.now(), delivered: false });
    return {
      providerKey: "mock",
      providerOrderId,
      phoneNumber,
      wholesaleCost: 0.2,
    };
  },

  async checkSMS(providerOrderId: string): Promise<SmsStatus> {
    const order = orders.get(providerOrderId);
    if (!order) return { status: "EXPIRED", code: null, message: null };
    const elapsed = Date.now() - order.createdAt;
    if (!order.delivered && elapsed > 8_000) {
      order.delivered = true;
      order.code = String(Math.floor(100000 + Math.random() * 900000));
      orders.set(providerOrderId, order);
    }
    if (order.delivered && order.code) {
      return {
        status: "RECEIVED",
        code: order.code,
        message: `Your verification code is ${order.code}`,
      };
    }
    return { status: "WAIT", code: null, message: null };
  },

  async cancel(providerOrderId: string) {
    orders.delete(providerOrderId);
  },

  async getBalance() {
    return 999;
  },
};
