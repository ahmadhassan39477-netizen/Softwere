import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import { decimalJson } from "@/lib/money";
import { pollOrder } from "@/lib/sms/order-lifecycle";

function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  if (phone.length <= 4) return "****";
  return `${"*".repeat(phone.length - 4)}${phone.slice(-4)}`;
}

/** Recent orders for Admin — phones masked (last 4 only). Never returns API keys. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const pollId = req.nextUrl.searchParams.get("poll");
  if (pollId) {
    const owned = await prisma.order.findUnique({ where: { id: pollId } });
    if (!owned) return jsonError("Order not found", 404);
    const result = await pollOrder(pollId);
    return Response.json({
      polled: {
        id: result?.id,
        status: result?.status,
        hasCode: Boolean(result?.code),
        codeLen: result?.code?.length ?? 0,
        phoneMasked: maskPhone(result?.phoneNumber ?? owned.phoneNumber),
        expiresAt: result?.expiresAt,
        providerKey: owned.providerKey,
        server: owned.server,
      },
    });
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      country: { select: { code: true, name: true, flag: true } },
      service: { select: { slug: true, name: true } },
      user: { select: { email: true } },
    },
  });

  return Response.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      server: o.server,
      providerKey: o.providerKey,
      hasProviderOrderId: Boolean(o.providerOrderId),
      hasOtp: Boolean(o.otpCode),
      otpLen: o.otpCode?.length ?? 0,
      phoneMasked: maskPhone(o.phoneNumber),
      price: decimalJson(o.price),
      createdAt: o.createdAt,
      expiresAt: o.expiresAt,
      country: o.country,
      service: o.service,
      userEmail: o.user.email,
    })),
  });
}
