import { createSaCompatibleAdapter } from "./sa-compatible";
import type { SmsAdapter } from "../types";

export const SMSBOWER_DEFAULT_BASE_URL =
  "https://smsbower.page/stubs/handler_api.php";

function defaultBaseUrl() {
  return process.env.SMSBOWER_BASE_URL?.trim() || SMSBOWER_DEFAULT_BASE_URL;
}

/**
 * Only accept a real SMSBower handler URL. Leftover SMS-Man get-sms / other
 * docs URLs on the slot must never be used for probe or buy.
 */
export function resolveSmsBowerBaseUrl(baseUrl?: string | null): string {
  const raw = baseUrl?.trim();
  if (!raw) return defaultBaseUrl();
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (!host.includes("smsbower")) return defaultBaseUrl();
    if (!/handler_api\.php/i.test(u.pathname)) {
      // Host is SMSBower but path wrong — still use canonical stubs endpoint
      return defaultBaseUrl();
    }
    return `${u.origin}${u.pathname}`;
  } catch {
    return defaultBaseUrl();
  }
}

/** True when stored baseUrl is leftover junk (SMS-Man docs, empty host, etc.). */
export function isStaleSmsBowerBaseUrl(baseUrl?: string | null): boolean {
  if (!baseUrl?.trim()) return false;
  return resolveSmsBowerBaseUrl(baseUrl) !== baseUrl.trim().replace(/\?.*$/, "");
}

/** Probe SMSBower api_key via getBalance — never logs the key. */
export async function probeSmsBowerApiKey(
  apiKey: string,
  baseUrl?: string | null,
): Promise<{
  ok: boolean;
  error?: string;
  balance?: number | null;
  /** Hard auth reject vs soft network/unexpected (Admin may still persist). */
  authRejected?: boolean;
}> {
  const key = apiKey.trim();
  if (!key) {
    return {
      ok: false,
      authRejected: true,
      error: "Paste your SMSBower API key from the SMSBower account page.",
    };
  }
  if (key.includes("*")) {
    return {
      ok: false,
      authRejected: true,
      error:
        "That key looks incomplete (contains *). Paste the full API key from SMSBower — never from chat.",
    };
  }
  if (/^https?:\/\//i.test(key) || key.includes("handler_api")) {
    return {
      ok: false,
      authRejected: true,
      error:
        "That looks like an API URL, not the SMSBower api_key. Copy the key from your SMSBower account only.",
    };
  }
  try {
    const url = new URL(resolveSmsBowerBaseUrl(baseUrl));
    url.searchParams.set("api_key", key);
    url.searchParams.set("action", "getBalance");
    const res = await fetch(url.toString(), { cache: "no-store" });
    const text = (await res.text()).trim();
    if (text.startsWith("ACCESS_BALANCE:")) {
      const bal = Number(text.split(":")[1]);
      return { ok: true, balance: Number.isFinite(bal) ? bal : null };
    }
    // Tight SA auth failures only — do not treat HTML "error" pages as BAD_KEY
    if (/^(BAD_KEY|WRONG_KEY|NO_KEY|BAD_ACTION|ERROR_API|ERROR_KEY)\b/i.test(text)) {
      return {
        ok: false,
        authRejected: true,
        error: "SMSBower rejected this API key. Copy it again from your SMSBower account.",
      };
    }
    return {
      ok: false,
      authRejected: false,
      error: "SMSBower did not accept this key (unexpected getBalance response).",
    };
  } catch {
    return {
      ok: false,
      authRejected: false,
      error: "Could not reach SMSBower getBalance.",
    };
  }
}

/** SMSBower number activation window (product FAQ: issued for 25 minutes). */
export const SMSBOWER_NUMBER_TTL_MINUTES = 25;

/** SMSBower — SMS-Activate–compatible handler_api.php. */
export function createSmsBowerAdapter(
  apiKey: string,
  baseUrl?: string | null,
): SmsAdapter {
  return createSaCompatibleAdapter({
    apiKey,
    providerKey: "smsbower",
    displayName: "SMSBower",
    baseUrl: resolveSmsBowerBaseUrl(baseUrl),
    // Extra Server 3: same 25‑minute wait as SMSBower numbers → SSE/order card TTL
    activationTtlMinutes: SMSBOWER_NUMBER_TTL_MINUTES,
  });
}
