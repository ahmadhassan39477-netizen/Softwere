/**
 * Customer-facing buy/stock errors — never name wholesale brands, env vars, or Admin paste steps.
 */

export const CUSTOMER_NO_STOCK =
  "This server has no numbers right now. Try another server or Auto.";

export const CUSTOMER_GMAIL_NO_STOCK =
  "No Gmail addresses available for that service right now. Try another service or check back shortly.";

export const CUSTOMER_SERVER_UNAVAILABLE =
  "This server isn’t available right now. Try another server or Auto.";

export const CUSTOMER_PROVIDER_BALANCE =
  "This server can’t complete the buy right now. Try another server or Auto, or try again later.";

export const CUSTOMER_BUY_FAILED =
  "Couldn’t buy a number right now. Try another server or Auto.";

/** Short Admin-only hints (never shown on /services). */
export const ADMIN_HINT_MISSING_KEY =
  "Server slot Enabled but no API key on file — open Admin → SMS providers → Save key on that server (legacy keys are auto-copied when present).";

export const ADMIN_HINT_DISABLED =
  "Server slot is Disabled — turn Enabled on for that server.";

export const ADMIN_HINT_BALANCE =
  "Wholesale wallet for this server looks empty — top up on the provider website for the same account as the saved key.";

/** Strip any leaky brand/env text if an older build still surfaces it. */
export function sanitizeCustomerBuyError(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return CUSTOMER_BUY_FAILED;
  if (/MISSING_KEYS|API keys not configured|FIVESIM_|GRIZZLY_|SMS_MAN_|SMS_ACTIVATE_|SMSBOWER_|Paste keys in Admin|5SIM|Grizzly|SMS-Man|SMS-Activate|SMSBower|smsbower|wholesale/i.test(text)) {
    if (/NO_BALANCE|balance/i.test(text)) return CUSTOMER_PROVIDER_BALANCE;
    if (/MISSING_KEYS|not configured|Paste keys/i.test(text)) return CUSTOMER_SERVER_UNAVAILABLE;
    return CUSTOMER_NO_STOCK;
  }
  if (/PROVIDER_NO_BALANCE|NO_BALANCE/i.test(text)) return CUSTOMER_PROVIDER_BALANCE;
  if (/NO_STOCK|Out of stock|no numbers/i.test(text)) return CUSTOMER_NO_STOCK;
  if (/Insufficient balance/i.test(text)) return text;
  // Unknown provider plumbing — keep generic
  if (/PROVIDER_|http_|ECONN|timeout|502|503/i.test(text)) return CUSTOMER_BUY_FAILED;
  return text.length > 160 ? CUSTOMER_BUY_FAILED : text;
}
