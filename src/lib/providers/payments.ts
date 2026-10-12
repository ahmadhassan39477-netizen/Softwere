import { createHmac, timingSafeEqual } from "crypto";
import { nanoid } from "nanoid";

export type DepositIntent = {
  id: string;
  amount: string;
  currency: string;
  method: string;
  payAddress?: string;
  payUrl?: string;
  status: "PENDING" | "COMPLETED";
};

/**
 * Mock / stub payment adapters. Real providers behind env vars.
 */
export async function createDepositIntent(input: {
  userId: string;
  amount: number;
  method: string;
  currency?: string;
}): Promise<DepositIntent> {
  const id = `dep_${nanoid(16)}`;
  const currency = input.currency ?? "USDT";

  if (process.env.USE_MOCK_PROVIDERS === "false") {
    // Placeholder for NOWPayments / Cryptomus / BTCPay wiring
    if (!process.env.NOWPAYMENTS_API_KEY && input.method.startsWith("crypto")) {
      throw new Error("Payment provider API key missing");
    }
  }

  // Instant mock credit path for local demo when method is mock_instant
  if (input.method === "mock_instant") {
    return {
      id,
      amount: input.amount.toFixed(4),
      currency,
      method: input.method,
      status: "COMPLETED",
    };
  }

  return {
    id,
    amount: input.amount.toFixed(4),
    currency,
    method: input.method,
    payAddress: `TMock${nanoid(28)}`,
    payUrl: `${process.env.NEXT_PUBLIC_APP_URL}/deposit?pending=${id}`,
    status: "PENDING",
  };
}

export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret = process.env.NOWPAYMENTS_IPN_SECRET ?? "mock-ipn-secret",
): boolean {
  if (!signature) return process.env.USE_MOCK_PROVIDERS !== "false";
  const expected = createHmac("sha512", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
