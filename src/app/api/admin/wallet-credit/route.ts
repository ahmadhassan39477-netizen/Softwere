import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import { creditWallet } from "@/lib/wallet";
import { decimalJson } from "@/lib/money";

const schema = z.object({
  userId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  amount: z.number().positive().max(50000),
  note: z.string().max(500).optional(),
});

/**
 * Admin-only: top up a customer's wallet after WhatsApp payment is confirmed offline.
 * No automatic / fake credits — owner must click this.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input — need amount and userId or email");

  if (!parsed.data.userId && !parsed.data.email) {
    return jsonError("Provide userId or email");
  }

  const target = parsed.data.userId
    ? await prisma.user.findUnique({ where: { id: parsed.data.userId } })
    : await prisma.user.findUnique({
        where: { email: parsed.data.email!.toLowerCase() },
      });

  if (!target) return jsonError("User not found", 404);

  const { balanceAfter, transaction } = await creditWallet(target.id, parsed.data.amount, {
    type: "DEPOSIT",
    method: "whatsapp_manual",
    status: "COMPLETED",
    meta: JSON.stringify({
      byAdmin: admin.id,
      note: parsed.data.note ?? "WhatsApp payment confirmed",
    }),
  });

  return Response.json({
    user: {
      id: target.id,
      email: target.email,
      balance: decimalJson(balanceAfter),
    },
    transactionId: transaction.id,
    credited: parsed.data.amount.toFixed(4),
  });
}
