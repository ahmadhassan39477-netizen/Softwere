/**
 * Compatibility bridge — prefer SmsAggregator (`@/lib/sms/aggregator`).
 * Existing routes that import getSmsProvider / purchaseWithFallback still work.
 */

import { smsAggregator } from "@/lib/sms/aggregator";
import type { BuyResult } from "@/lib/sms/types";

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

function toPurchase(r: BuyResult): PurchaseResult {
  return {
    providerOrderId: r.providerOrderId,
    phoneNumber: r.phoneNumber,
    providerKey: r.providerKey,
  };
}

export function providerForKey(providerKey: string): SmsProvider {
  return {
    key: providerKey,
    async purchase(input) {
      const r = await smsAggregator.buy({
        countryCode: input.countryCode,
        serviceSlug: input.serviceSlug,
        server: input.server as 1 | 2 | 3,
      });
      return toPurchase(r);
    },
    async getOtp(providerOrderId) {
      const sms = await smsAggregator.checkSMS(providerKey, providerOrderId);
      return {
        code: sms.code,
        message: sms.message,
        status:
          sms.status === "ERROR"
            ? "WAIT"
            : (sms.status as OtpResult["status"]),
      };
    },
    async cancel(providerOrderId) {
      await smsAggregator.cancel(providerKey, providerOrderId);
    },
  };
}

export function getSmsProvider(providerKey = "mock"): SmsProvider {
  return providerForKey(providerKey);
}

export async function purchaseWithFallback(input: {
  countryCode: string;
  serviceSlug: string;
  server: number;
}): Promise<PurchaseResult> {
  const r = await smsAggregator.buy({
    countryCode: input.countryCode,
    serviceSlug: input.serviceSlug,
    server: "auto",
  });
  return toPurchase(r);
}

export const mockSmsProvider = providerForKey("mock");
