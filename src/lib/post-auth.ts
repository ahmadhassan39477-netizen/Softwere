/** After signup or sign in, always land on the OTP shop. */

export const DEFAULT_POST_AUTH = "/services";

export function sanitizeCallback(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_POST_AUTH;
  return raw;
}

function isServicesPath(path: string): boolean {
  const pathname = path.split("?")[0];
  return pathname === "/services" || pathname.startsWith("/services/");
}

/**
 * Credentials login, register, and Auth.js redirects.
 * Keep /services and /services?… — never send a fresh session to Deposit.
 */
export function postAuthDestination(raw: string | null | undefined): string {
  const next = sanitizeCallback(raw);
  if (isServicesPath(next)) return next;
  return DEFAULT_POST_AUTH;
}

/** Guest hitting a protected route: Services stays Services; Deposit becomes Services. */
export function guestRegisterCallback(pathname: string, search = ""): string {
  const query = search && search !== "?" ? search : "";
  if (pathname === "/deposit" || pathname.startsWith("/deposit/")) return DEFAULT_POST_AUTH;
  if (!pathname || pathname === "/") return DEFAULT_POST_AUTH;
  if (isServicesPath(pathname)) return `${pathname}${query}`;
  return DEFAULT_POST_AUTH;
}
