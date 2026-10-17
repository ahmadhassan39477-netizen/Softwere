/** Logged-out shop links always go through signup first. */
export function registerHref(callbackUrl = "/deposit"): string {
  const next = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/deposit";
  return `/register?callbackUrl=${encodeURIComponent(next)}`;
}

export const REGISTER_DEPOSIT = registerHref("/deposit");
export const REGISTER_SERVICES = registerHref("/services");
export const REGISTER_USA = registerHref("/services?country=US");
export const REGISTER_UK = registerHref("/services?country=GB");
export const REGISTER_CANADA = registerHref("/services?country=CA");
export const REGISTER_FACEBOOK = registerHref("/services?service=facebook");
export const REGISTER_MAIL = registerHref("/temp-mail");
export const REGISTER_API = registerHref("/api-docs");
