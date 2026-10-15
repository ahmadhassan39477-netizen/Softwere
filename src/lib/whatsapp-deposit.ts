import { prisma } from "@/lib/prisma";

const SETTING_KEY = "whatsapp_business_number";

/** Owner-provided deposit WhatsApp (Areesha). Used when Admin/env not set yet. */
export const DEFAULT_WHATSAPP_BUSINESS_NUMBER = "923287087121";

/** Digits-only for wa.me links. Returns null if empty/invalid. */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  return digits;
}

/**
 * Resolve business WhatsApp: Admin Setting → env WHATSAPP_BUSINESS_NUMBER → owner default.
 */
export async function getWhatsAppBusinessNumber(): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    const fromDb = normalizeWhatsAppNumber(row?.value);
    if (fromDb) return fromDb;
  } catch {
    /* ignore */
  }
  return (
    normalizeWhatsAppNumber(process.env.WHATSAPP_BUSINESS_NUMBER) ??
    DEFAULT_WHATSAPP_BUSINESS_NUMBER
  );
}

export function whatsappChatUrl(number: string, prefill: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(prefill)}`;
}

export function buildDepositPrefill(amountUsd: number | string, email: string): string {
  const amt = Number(amountUsd);
  const pretty = Number.isFinite(amt) ? amt.toFixed(2) : String(amountUsd);
  return `Hi Areesha, I want to deposit $${pretty} to my Temp Empire wallet.\nEmail: ${email || "(sign in email)"}`;
}

export { SETTING_KEY as WHATSAPP_SETTING_KEY };
