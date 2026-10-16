import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import {
  DEFAULT_WHATSAPP_BUSINESS_NUMBERS,
  getWhatsAppBusinessNumbers,
  parseWhatsAppNumberList,
  serializeWhatsAppNumbers,
  WHATSAPP_SETTING_KEY,
} from "@/lib/whatsapp-deposit";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const numbers = await getWhatsAppBusinessNumbers();
  return Response.json({
    number: numbers.join(", "),
    numbers,
    configured: numbers.length > 0,
    defaultNumbers: [...DEFAULT_WHATSAPP_BUSINESS_NUMBERS],
    requiredEnv: ["WHATSAPP_BUSINESS_NUMBER"],
  });
}

const patchSchema = z.object({
  number: z.string().min(8).max(200),
});

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid number");

  const numbers = parseWhatsAppNumberList(parsed.data.number);
  if (numbers.length === 0) {
    return jsonError(
      "Enter one or more WhatsApp numbers with country code (e.g. 923287087121, 923072577778 or 03072577778)",
    );
  }

  const value = serializeWhatsAppNumbers(numbers);
  await prisma.setting.upsert({
    where: { key: WHATSAPP_SETTING_KEY },
    create: { key: WHATSAPP_SETTING_KEY, value },
    update: { value },
  });

  return Response.json({ number: value, numbers, configured: true });
}
