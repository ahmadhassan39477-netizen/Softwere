import { prisma } from "@/lib/prisma";
import {
  DEFAULT_WHATSAPP_BUSINESS_NUMBER,
  WHATSAPP_SETTING_KEY,
  buildDepositPrefill,
  normalizeWhatsAppNumber,
  whatsappChatUrl,
} from "@/lib/whatsapp-copy";

export {
  DEFAULT_WHATSAPP_BUSINESS_NUMBER,
  WHATSAPP_SETTING_KEY,
  buildDepositPrefill,
  normalizeWhatsAppNumber,
  whatsappChatUrl,
};

/**
 * Resolve business WhatsApp: Admin Setting → env WHATSAPP_BUSINESS_NUMBER → owner default.
 */
export async function getWhatsAppBusinessNumber(): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: WHATSAPP_SETTING_KEY } });
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
