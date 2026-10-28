import { createSaCompatibleAdapter } from "./sa-compatible";
import type { SmsAdapter } from "../types";

export const SMSBOWER_DEFAULT_BASE_URL =
  "https://smsbower.page/stubs/handler_api.php";

function defaultBaseUrl() {
  return process.env.SMSBOWER_BASE_URL?.trim() || SMSBOWER_DEFAULT_BASE_URL;
}

/** Probe SMSBower api_key via getBalance — never logs the key. */
export async function probeSmsBowerApiKey(
  apiKey: string,
  baseUrl?: string | null,
): Promise<{ ok: boolean; error?: string; balance?: number | null }> {
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, error: "Paste your SMSBower API key from the SMSBower account page." };
  }
  if (key.includes("*")) {
    return {
      ok: false,
      error:
        "That key looks incomplete (contains *). Paste the full API key from SMSBower — never from chat.",
    };
  }
  if (/^https?:\/\//i.test(key) || key.includes("handler_api")) {
    return {
      ok: false,
      error:
        "That looks like an API URL, not the SMSBower api_key. Copy the key from your SMSBower account only.",
    };
  }
  try {
    const url = new URL(baseUrl?.trim() || defaultBaseUrl());
    url.searchParams.set("api_key", key);
    url.searchParams.set("action", "getBalance");
    const res = await fetch(url.toString(), { cache: "no-store" });
    const text = (await res.text()).trim();
    if (text.startsWith("ACCESS_BALANCE:")) {
      const bal = Number(text.split(":")[1]);
      return { ok: true, balance: Number.isFinite(bal) ? bal : null };
    }
    if (/bad.?key|wrong.?key|no.?key|error/i.test(text)) {
      return {
        ok: false,
        error: "SMSBower rejected this API key. Copy it again from your SMSBower account.",
      };
    }
    return {
      ok: false,
      error: "SMSBower did not accept this key (unexpected getBalance response).",
    };
  } catch {
    return { ok: false, error: "Could not reach SMSBower getBalance." };
  }
}

/** SMSBower — SMS-Activate–compatible handler_api.php. */
export function createSmsBowerAdapter(
  apiKey: string,
  baseUrl?: string | null,
): SmsAdapter {
  return createSaCompatibleAdapter({
    apiKey,
    providerKey: "smsbower",
    displayName: "SMSBower",
    baseUrl: baseUrl?.trim() || defaultBaseUrl(),
  });
}
