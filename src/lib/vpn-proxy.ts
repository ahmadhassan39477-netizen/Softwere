/** Admin-stored VPN / proxy settings. No key in git. */

export const VPN_SETTING_KEY = "vpn_proxy_api_key";
export const VPN_PROVIDER_SETTING_KEY = "vpn_proxy_provider";
export const VPN_BASE_URL_SETTING_KEY = "vpn_proxy_base_url";
export const VPN_DISPLAY_SETTING_KEY = "vpn_proxy_display_name";

export const VPN_DEFAULT_DISPLAY = "VPN & Proxy";

export function maskSecret(value: string | null | undefined): string {
  const v = value?.trim() ?? "";
  if (!v) return "";
  if (v.length <= 4) return "••••";
  return `${v.slice(0, 2)}••••${v.slice(-2)}`;
}

export function normalizeProviderLabel(raw: string | null | undefined): string {
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
