import { DEFAULT_POST_AUTH, sanitizeCallback } from "@/lib/post-auth";

/** Logged-out shop links go through signup, then Deposit (not live OTP). */
export function registerHref(callbackUrl = DEFAULT_POST_AUTH): string {
  const next = sanitizeCallback(callbackUrl);
  return `/register?callbackUrl=${encodeURIComponent(next)}`;
}

export const REGISTER_DEPOSIT = registerHref(DEFAULT_POST_AUTH);
/** Guest shop / OTP chips — after signup they land on Deposit. */
export const REGISTER_SERVICES = REGISTER_DEPOSIT;
export const REGISTER_USA = REGISTER_DEPOSIT;
export const REGISTER_UK = REGISTER_DEPOSIT;
export const REGISTER_CANADA = REGISTER_DEPOSIT;
export const REGISTER_FACEBOOK = REGISTER_DEPOSIT;
export const REGISTER_MAIL = registerHref("/temp-mail");
export const REGISTER_API = registerHref("/api-docs");
