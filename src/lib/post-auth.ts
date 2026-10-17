/** After signup/signin, land on Deposit — never dump an empty wallet onto /services. */

export const DEFAULT_POST_AUTH = "/deposit";

export function sanitizeCallback(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_POST_AUTH;
  return raw;
}

export function isServicesCallback(path: string): boolean {
  const pathname = path.split("?")[0];
  return pathname === "/services" || pathname.startsWith("/services/");
}

export function hasServicesDeepLink(path: string): boolean {
  if (!isServicesCallback(path) || !path.includes("?")) return false;
  try {
    const url = new URL(path, "https://www.tempempire.store");
    return Boolean(url.searchParams.get("country") || url.searchParams.get("service"));
  } catch {
    return false;
  }
}

/**
 * Default after auth = Deposit.
 * Honor /services?country=… or ?service=… only when the wallet already has credit.
 */
export function postAuthDestination(raw: string | null | undefined, balance = 0): string {
  const next = sanitizeCallback(raw);
  if (isServicesCallback(next)) {
    if (Number(balance) > 0 && hasServicesDeepLink(next)) return next;
    return DEFAULT_POST_AUTH;
  }
  return next;
}

/** Guest hitting a protected shop route: Services callbacks become Deposit. */
export function guestRegisterCallback(pathname: string, search = ""): string {
  const query = search && search !== "?" ? search : "";
  if (isServicesCallback(pathname)) {
    if (query) return `${pathname}${query}`;
    return DEFAULT_POST_AUTH;
  }
  return `${pathname}${query}` || DEFAULT_POST_AUTH;
}

export async function sessionBalance(): Promise<number> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return 0;
    const data = (await res.json()) as { user?: { balance?: string } };
    const n = Number(data.user?.balance ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
