import { DEFAULT_POST_AUTH, sanitizeCallback } from "@/lib/post-auth";

/** Logged-out shop links go through signup, then the OTP shop. */
export function registerHref(callbackUrl = DEFAULT_POST_AUTH): string {
  const next = sanitizeCallback(callbackUrl);
  return `/register?callbackUrl=${encodeURIComponent(next)}`;
}

export const REGISTER_SERVICES = registerHref(DEFAULT_POST_AUTH);
export const REGISTER_USA = registerHref("/services?country=US");
export const REGISTER_UK = registerHref("/services?country=GB");
export const REGISTER_CANADA = registerHref("/services?country=CA");
export const REGISTER_FACEBOOK = registerHref("/services?service=facebook");
/** Footer Deposit still goes through signup; after auth they land on Services. */
export const REGISTER_DEPOSIT = registerHref("/services");
export const REGISTER_MAIL = registerHref("/temp-mail");
export const REGISTER_VPN = registerHref("/vpn");
export const REGISTER_API = registerHref("/api-docs");

/** Guests go through signup; signed-in shoppers open the live page. */
export function shopHref(signedIn: boolean, path: "/temp-mail" | "/vpn"): string {
  return signedIn ? path : registerHref(path);
}
