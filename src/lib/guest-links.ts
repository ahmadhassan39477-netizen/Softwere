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
/** Explicit Deposit link — not the default after signup. */
export const REGISTER_DEPOSIT = registerHref("/deposit");
export const REGISTER_MAIL = registerHref("/temp-mail");
export const REGISTER_API = registerHref("/api-docs");
