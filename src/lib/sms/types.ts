export type ProviderKey =
  | "sms-activate"
  | "5sim"
  | "grizzlysms"
  | "sms-man"
  | "smsbower"
  | "mock";

export type BuyInput = {
  countryCode: string;
  serviceSlug: string;
  /** 1 | 2 | 3 preferred pool hint; Auto omits and tries all providers */
  server?: number | "auto";
  /** 5SIM operator / Grizzly provider id when buying a specific multi-offer row */
  operator?: string;
  /** Human network label persisted on the order */
  networkLabel?: string;
  /** Grizzly/SA FreePrice ceiling (wholesale USD) */
  maxPrice?: number;
  /** Grizzly providerIds (comma-joinable); usually a single id */
  providerIds?: string;
};

export type BuyResult = {
  providerKey: ProviderKey;
  providerOrderId: string;
  phoneNumber: string;
  wholesaleCost: number;
  /** Admin Server slot that fulfilled the buy (1|2|3) */
  serverSlot?: 1 | 2 | 3;
  /** Slot markup % used for retail (default 20 → × 1.20) */
  markupPercent?: number;
  /**
   * Provider-reported activation deadline (e.g. 5SIM `expires`).
   * Shop wait window = max(floor TTL, this time).
   */
  providerExpiresAt?: Date;
  /** Echo of the selected operator/network when known */
  operator?: string;
  networkLabel?: string;
};

export type SmsStatus = {
  status: "WAIT" | "RECEIVED" | "CANCELLED" | "EXPIRED" | "ERROR";
  code: string | null;
  message: string | null;
};

export type ProviderPriceRow = {
  countryCode: string;
  serviceSlug: string;
  wholesale: number;
  available: boolean;
  /** Optional live qty from wholesale (e.g. 5SIM Qty). */
  stock?: number;
  /** Network/operator code (5SIM virtual28, Grizzly provider id, etc.) */
  operator?: string;
  /** Display label for the shop */
  networkLabel?: string;
  /** Provider-reported delivery rate 0–100 (5SIM rate) when available */
  providerRate?: number;
  /** Grizzly FreePrice ceiling — usually same as wholesale for a bucket */
  maxPrice?: number;
  /** Stable id for this offer row within a slot */
  offerKey?: string;
};

export interface SmsAdapter {
  key: ProviderKey;
  displayName: string;
  /** Buy activation number */
  buy(input: BuyInput): Promise<BuyResult>;
  checkSMS(providerOrderId: string): Promise<SmsStatus>;
  cancel(providerOrderId: string): Promise<void>;
  /** Optional balance probe — never throw secrets */
  getBalance(): Promise<number | null>;
  /** Optional live prices; return [] if unsupported. May include multiple rows per service. */
  getPrices?(countryCode?: string): Promise<ProviderPriceRow[]>;
}

export class ProviderNoStockError extends Error {
  code = "NO_NUMBERS" as const;
  constructor(message = "NO_NUMBERS") {
    super(message);
    this.name = "ProviderNoStockError";
  }
}

export class ProviderBalanceError extends Error {
  code = "NO_BALANCE" as const;
  constructor(message = "NO_BALANCE") {
    super(message);
    this.name = "ProviderBalanceError";
  }
}

export class AllProvidersFailedError extends Error {
  code = "NO_STOCK_AVAILABLE" as const;
  attempts: { provider: ProviderKey; error: string }[];
  constructor(attempts: { provider: ProviderKey; error: string }[]) {
    super("NO_STOCK_AVAILABLE");
    this.name = "AllProvidersFailedError";
    this.attempts = attempts;
  }
}
