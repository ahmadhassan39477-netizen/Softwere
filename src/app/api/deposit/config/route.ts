import { requireUser, jsonError } from "@/lib/api-auth";
import {
  buildDepositPrefill,
  getWhatsAppDepositLines,
  whatsappChatUrl,
} from "@/lib/whatsapp-deposit";
import { decimalJson } from "@/lib/money";
import { prisma } from "@/lib/prisma";

/** Deposit page config — WhatsApp chat for manual payment (customer-safe copy). */
export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("Unauthorized", 401);

  const lines = await getWhatsAppDepositLines();
  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const samplePrefill = buildDepositPrefill(10, user.email);

  return Response.json({
    balance: decimalJson(fresh.balance),
    whatsappConfigured: lines.length > 0,
    /** @deprecated first number — prefer `whatsappNumbers` */
    whatsappNumber: lines[0]?.number ?? null,
    whatsappDisplay: lines[0]?.display ?? null,
    whatsappNumbers: lines.map((l) => ({
      number: l.number,
      display: l.display,
      localDisplay: l.localDisplay,
      sampleChatUrl: whatsappChatUrl(l.number, samplePrefill),
    })),
    sampleChatUrl: lines[0]
      ? whatsappChatUrl(lines[0].number, samplePrefill)
      : null,
    requiredEnv: ["WHATSAPP_BUSINESS_NUMBER"],
    instructions:
      "Message us on WhatsApp to add credit. Use either number below. Include your account email and the amount you paid. Balance updates after we confirm payment — nothing is credited automatically.",
  });
}
