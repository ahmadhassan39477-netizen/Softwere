/** Default deposit WhatsApp (digits only). Env / Admin Setting can override. */
export const DEFAULT_WHATSAPP_BUSINESS_NUMBER = "923287087121";

export const WHATSAPP_SETTING_KEY = "whatsapp_business_number";

/** Digits-only for wa.me links. Returns null if empty/invalid. */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  return digits;
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
