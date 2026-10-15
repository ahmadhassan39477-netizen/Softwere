import { createSaCompatibleAdapter } from "./sa-compatible";
import type { SmsAdapter } from "../types";

function defaultBaseUrl() {
  return (
    process.env.GRIZZLY_SMS_BASE_URL?.trim() ||
    "https://api.grizzlysms.com/stubs/handler_api.php"
  );
}

export function createGrizzlySmsAdapter(
  apiKey: string,
  baseUrl?: string | null,
): SmsAdapter {
  return createSaCompatibleAdapter({
    apiKey,
    providerKey: "grizzlysms",
    displayName: "Grizzly SMS",
    baseUrl: baseUrl?.trim() || defaultBaseUrl(),
  });
}
