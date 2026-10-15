import { createSaCompatibleAdapter } from "./sa-compatible";
import type { SmsAdapter } from "../types";

function defaultBaseUrl() {
  return (
    process.env.SMS_ACTIVATE_BASE_URL?.trim() ||
    "https://api.sms-activate.org/stubs/handler_api.php"
  );
}

export function createSmsActivateAdapter(
  apiKey: string,
  baseUrl?: string | null,
): SmsAdapter {
  return createSaCompatibleAdapter({
    apiKey,
    providerKey: "sms-activate",
    displayName: "SMS-Activate",
    baseUrl: baseUrl?.trim() || defaultBaseUrl(),
  });
}
