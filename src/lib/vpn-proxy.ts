/** Admin-stored VPN / proxy settings. No key in git. Never log secrets. */

export const VPN_SETTING_KEY = "vpn_proxy_api_key";
export const VPN_SECRET_SETTING_KEY = "vpn_proxy_api_secret";
export const VPN_PROVIDER_SETTING_KEY = "vpn_proxy_provider";
export const VPN_BASE_URL_SETTING_KEY = "vpn_proxy_base_url";
export const VPN_DISPLAY_SETTING_KEY = "vpn_proxy_display_name";
export const VPN_ENABLED_SETTING_KEY = "vpn_proxy_enabled";
export const VPN_MARKUP_SETTING_KEY = "vpn_proxy_markup_percent";

export const VPN_DEFAULT_DISPLAY = "VPN & Proxy";
export const VPN_DEFAULT_PROVIDER = "Proxy Cheap";
export const VPN_DEFAULT_BASE_URL = "https://api.proxy-cheap.com";
export const VPN_DEFAULT_MARKUP = 20;

export const VPN_SETTING_KEYS = [
  VPN_SETTING_KEY,
  VPN_SECRET_SETTING_KEY,
  VPN_PROVIDER_SETTING_KEY,
  VPN_BASE_URL_SETTING_KEY,
  VPN_DISPLAY_SETTING_KEY,
  VPN_ENABLED_SETTING_KEY,
  VPN_MARKUP_SETTING_KEY,
] as const;

export function maskSecret(value: string | null | undefined): string {
  const v = value?.trim() ?? "";
  if (!v) return "";
  if (v.length <= 4) return "••••";
  return `${v.slice(0, 2)}••••${v.slice(-2)}`;
}

export function normalizeProviderLabel(raw: string | null | undefined): string {
  const v = (raw ?? "").trim().slice(0, 80);
  if (!v) return VPN_DEFAULT_PROVIDER;
  if (/proxy\s*-?\s*cheap/i.test(v)) return VPN_DEFAULT_PROVIDER;
  return v;
}

export function normalizeDisplayName(raw: string | null | undefined): string {
  const v = (raw ?? "").trim().slice(0, 80);
  return v || VPN_DEFAULT_DISPLAY;
}

export function normalizeBaseUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function parseEnabled(raw: string | null | undefined, fallback = true): boolean {
  if (raw == null || raw === "") return fallback;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

export function parseMarkupPercent(raw: string | null | undefined): number {
  if (raw == null || String(raw).trim() === "") return VPN_DEFAULT_MARKUP;
  const n = Number(raw);
  if (!Number.isFinite(n)) return VPN_DEFAULT_MARKUP;
  return Math.min(500, Math.max(0, n));
}

export function retailFromWholesale(wholesale: number, markupPercent: number): number {
  const markup = Number.isFinite(markupPercent) ? markupPercent : VPN_DEFAULT_MARKUP;
  return Number((wholesale * (1 + markup / 100)).toFixed(4));
}

export function purchaseSettingKey(userId: string): string {
  return `vpn_proxy_purchases_${userId}`;
}

/** Strip secrets from an error string before it is stored or returned. */
export function sanitizeProviderError(message: string, secrets: Array<string | null | undefined>): string {
  let out = (message || "Provider error").slice(0, 240);
  for (const secret of secrets) {
    const s = secret?.trim();
    if (!s || s.length < 4) continue;
    out = out.split(s).join("[redacted]");
  }
  return out;
}
