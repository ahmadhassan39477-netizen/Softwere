export type ProviderKey = "sms-activate" | "5sim" | "grizzlysms" | "mock";

export type BuyInput = {
  countryCode: string;
  serviceSlug: string;
  /** 1 | 2 | 3 preferred pool hint; Auto omits and tries all providers */
  server?: number | "auto";
};

export type BuyResult = {
  providerKey: ProviderKey;
  providerOrderId: string;
  phoneNumber: string;
  wholesaleCost: number;
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
  /** Optional live prices; return [] if unsupported */
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
