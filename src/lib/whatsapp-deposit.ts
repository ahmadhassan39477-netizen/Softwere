import { prisma } from "@/lib/prisma";
import {
  DEFAULT_WHATSAPP_BUSINESS_NUMBER,
  DEFAULT_WHATSAPP_BUSINESS_NUMBERS,
  SECONDARY_WHATSAPP_BUSINESS_NUMBER,
  WHATSAPP_SETTING_KEY,
  buildDepositPrefill,
  formatWhatsAppDisplay,
  normalizeWhatsAppNumber,
  parseWhatsAppNumberList,
  serializeWhatsAppNumbers,
  whatsappChatUrl,
  type WhatsAppDisplay,
} from "@/lib/whatsapp-copy";

export {
  DEFAULT_WHATSAPP_BUSINESS_NUMBER,
  DEFAULT_WHATSAPP_BUSINESS_NUMBERS,
  SECONDARY_WHATSAPP_BUSINESS_NUMBER,
  WHATSAPP_SETTING_KEY,
  buildDepositPrefill,
  formatWhatsAppDisplay,
  normalizeWhatsAppNumber,
  parseWhatsAppNumberList,
  serializeWhatsAppNumbers,
  whatsappChatUrl,
};
export type { WhatsAppDisplay };

/**
 * Resolve deposit WhatsApp lines: Admin Setting → env → both defaults.
 * Always includes both launch numbers when Admin still has the old single default.
 */
export async function getWhatsAppBusinessNumbers(): Promise<string[]> {
  let fromStore: string[] = [];
  try {
    const row = await prisma.setting.findUnique({ where: { key: WHATSAPP_SETTING_KEY } });
    fromStore = parseWhatsAppNumberList(row?.value);
  } catch {
    /* ignore */
  }

  const fromEnv = parseWhatsAppNumberList(process.env.WHATSAPP_BUSINESS_NUMBER);

  let numbers =
    fromStore.length > 0
      ? fromStore
      : fromEnv.length > 0
        ? fromEnv
        : [...DEFAULT_WHATSAPP_BUSINESS_NUMBERS];

  // Soft-migrate: old single primary → keep primary and add secondary
  if (
    numbers.length === 1 &&
    numbers[0] === DEFAULT_WHATSAPP_BUSINESS_NUMBER &&
    !numbers.includes(SECONDARY_WHATSAPP_BUSINESS_NUMBER)
  ) {
    numbers = [DEFAULT_WHATSAPP_BUSINESS_NUMBER, SECONDARY_WHATSAPP_BUSINESS_NUMBER];
    await prisma.setting
      .upsert({
        where: { key: WHATSAPP_SETTING_KEY },
        create: {
          key: WHATSAPP_SETTING_KEY,
          value: serializeWhatsAppNumbers(numbers),
        },
        update: { value: serializeWhatsAppNumbers(numbers) },
      })
      .catch(() => undefined);
  }

  return numbers;
}

/** @deprecated Prefer getWhatsAppBusinessNumbers — returns the first line. */
export async function getWhatsAppBusinessNumber(): Promise<string> {
  const list = await getWhatsAppBusinessNumbers();
  return list[0] ?? DEFAULT_WHATSAPP_BUSINESS_NUMBER;
}

export async function getWhatsAppDepositLines(): Promise<WhatsAppDisplay[]> {
  const numbers = await getWhatsAppBusinessNumbers();
  return numbers.map((n) => formatWhatsAppDisplay(n));
}
