/** Default deposit WhatsApp (digits only, country code). */
export const DEFAULT_WHATSAPP_BUSINESS_NUMBER = "923153378418";

/** Retired lines — stripped on soft-migrate so Deposit never shows them again. */
export const RETIRED_WHATSAPP_BUSINESS_NUMBERS = [
  "923072577778", // 03072577778
  "923287087121", // 03287087121
] as const;

/** @deprecated Use RETIRED_WHATSAPP_BUSINESS_NUMBERS */
export const RETIRED_WHATSAPP_BUSINESS_NUMBER = RETIRED_WHATSAPP_BUSINESS_NUMBERS[1];

export const DEFAULT_WHATSAPP_BUSINESS_NUMBERS = [DEFAULT_WHATSAPP_BUSINESS_NUMBER] as const;

/** @deprecated Use DEFAULT_WHATSAPP_BUSINESS_NUMBER */
export const SECONDARY_WHATSAPP_BUSINESS_NUMBER = DEFAULT_WHATSAPP_BUSINESS_NUMBER;

export const WHATSAPP_SETTING_KEY = "whatsapp_business_number";

export function isRetiredWhatsAppNumber(digits: string): boolean {
  return (RETIRED_WHATSAPP_BUSINESS_NUMBERS as readonly string[]).includes(digits);
}

/** Digits-only for wa.me links. Returns null if empty/invalid. */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");
  // Pakistan local 03XXXXXXXXX → 923XXXXXXXXX
  if (digits.startsWith("03") && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  }
  if (digits.length < 8) return null;
  return digits;
}

/** Parse one or many numbers from Admin/env (comma, space, or newline separated). */
export function parseWhatsAppNumberList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const parts = raw.split(/[\s,;|]+/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const n = normalizeWhatsAppNumber(part);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export type WhatsAppDisplay = {
  number: string;
  display: string;
  localDisplay: string | null;
  chatUrl: (prefill: string) => string;
};

/** Pretty PK / E.164-style display for customer UI. */
export function formatWhatsAppDisplay(digits: string): WhatsAppDisplay {
  const number = normalizeWhatsAppNumber(digits) ?? digits.replace(/[^\d]/g, "");
  let display = `+${number}`;
  let localDisplay: string | null = null;
  if (number.startsWith("92") && number.length >= 12) {
    const national = number.slice(2);
    display = `+92 ${national.slice(0, 3)} ${national.slice(3)}`;
    localDisplay = `0${national}`;
  }
  return {
    number,
    display,
    localDisplay,
    chatUrl: (prefill: string) => whatsappChatUrl(number, prefill),
  };
}

export function whatsappChatUrl(number: string, prefill: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(prefill)}`;
}

/** Customer-facing WhatsApp prefill — never names owners or Admin internals. */
export function buildDepositPrefill(amountUsd: number | string, email: string): string {
  const amt = Number(amountUsd);
  const pretty = Number.isFinite(amt) ? amt.toFixed(2) : String(amountUsd);
  return `Hi Temp Empire, I want to add $${pretty} credit to my wallet.\nEmail: ${email || "(sign in email)"}`;
}

/** Serialize list for Admin Setting storage. */
export function serializeWhatsAppNumbers(numbers: string[]): string {
  return numbers.join(", ");
}
