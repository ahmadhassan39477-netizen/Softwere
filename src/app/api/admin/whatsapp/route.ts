import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import {
  DEFAULT_WHATSAPP_BUSINESS_NUMBER,
  getWhatsAppBusinessNumber,
  normalizeWhatsAppNumber,
  WHATSAPP_SETTING_KEY,
} from "@/lib/whatsapp-deposit";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const number = await getWhatsAppBusinessNumber();
  return Response.json({
    number,
    configured: true,
    defaultNumber: DEFAULT_WHATSAPP_BUSINESS_NUMBER,
    requiredEnv: ["WHATSAPP_BUSINESS_NUMBER"],
  });
}

const patchSchema = z.object({
  number: z.string().min(8).max(32),
});

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid number");

  const normalized = normalizeWhatsAppNumber(parsed.data.number);
  if (!normalized) return jsonError("Enter a valid WhatsApp number with country code");

  await prisma.setting.upsert({
    where: { key: WHATSAPP_SETTING_KEY },
    create: { key: WHATSAPP_SETTING_KEY, value: normalized },
    update: { value: normalized },
  });

  return Response.json({ number: normalized, configured: true });
}
