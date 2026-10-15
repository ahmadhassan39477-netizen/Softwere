import { requireUser, jsonError } from "@/lib/api-auth";
import {
  buildDepositPrefill,
  getWhatsAppBusinessNumber,
  whatsappChatUrl,
} from "@/lib/whatsapp-deposit";
import { decimalJson } from "@/lib/money";
import { prisma } from "@/lib/prisma";

/** Deposit page config — WhatsApp chat for manual payment (customer-safe copy). */
export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("Unauthorized", 401);

  const number = await getWhatsAppBusinessNumber();
  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const samplePrefill = buildDepositPrefill(10, user.email);

  return Response.json({
    balance: decimalJson(fresh.balance),
    whatsappConfigured: true,
    whatsappNumber: number,
    whatsappDisplay: `+${number}`,
    sampleChatUrl: whatsappChatUrl(number, samplePrefill),
    requiredEnv: ["WHATSAPP_BUSINESS_NUMBER"],
    instructions:
      "Message us on WhatsApp to add credit. Include your account email and the amount you paid. Balance updates after we confirm payment — nothing is credited automatically.",
  });
}
