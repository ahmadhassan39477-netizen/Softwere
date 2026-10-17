/** After signup/signin, land on the OTP shop. Never rewrite a callback to Deposit. */

export const DEFAULT_POST_AUTH = "/services";

export function sanitizeCallback(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_POST_AUTH;
  return raw;
}

/** Honor the requested path. Default is Services — do not swap /services → /deposit. */
export function postAuthDestination(raw: string | null | undefined): string {
  return sanitizeCallback(raw);
}

/** Guest hitting a protected route keeps that path as the post-signup callback. */
export function guestRegisterCallback(pathname: string, search = ""): string {
  const query = search && search !== "?" ? search : "";
  if (!pathname || pathname === "/") return DEFAULT_POST_AUTH;
  return `${pathname}${query}`;
}
