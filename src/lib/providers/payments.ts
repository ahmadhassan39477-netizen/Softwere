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
 * Legacy crypto/manual deposit intents.
 * mock_instant is disabled in production — credits only via WhatsApp deposit + owner top-up.
 */
export async function createDepositIntent(input: {
  userId: string;
  amount: number;
  method: string;
  currency?: string;
}): Promise<DepositIntent> {
  const id = `dep_${nanoid(16)}`;
  const currency = input.currency ?? "USDT";

  if (input.method === "mock_instant") {
    // Never auto-credit in production, even if an old client posts this method.
    if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
      throw new Error(
        "Instant demo deposits are disabled. Message us on WhatsApp to add credit.",
      );
    }
    if (process.env.USE_MOCK_PROVIDERS !== "true") {
      throw new Error("mock_instant only allowed when USE_MOCK_PROVIDERS=true");
    }
    return {
      id,
      amount: input.amount.toFixed(4),
      currency,
      method: input.method,
      status: "COMPLETED",
    };
  }

  if (input.method.startsWith("crypto") && !process.env.NOWPAYMENTS_API_KEY?.trim()) {
    throw new Error(
      "Crypto deposits are not connected. Use WhatsApp on /deposit instead.",
    );
  }

  return {
    id,
    amount: input.amount.toFixed(4),
    currency,
    method: input.method,
    payAddress: undefined,
    payUrl: `/deposit`,
    status: "PENDING",
  };
}

export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret = process.env.NOWPAYMENTS_IPN_SECRET ?? "",
): boolean {
  if (!secret) return false;
  if (!signature) return false;
  const expected = createHmac("sha512", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
