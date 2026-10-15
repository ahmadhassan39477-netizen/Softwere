import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { creditWallet } from "@/lib/wallet";
import { smsAggregator } from "./aggregator";

/**
 * Poll one active order: check provider SMS, apply 15-min expiry refund.
 * Safe to call from SSE, cron, or client poll.
 */
export async function pollOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;

  if (["RECEIVED", "CANCELLED", "REFUNDED", "EXPIRED"].includes(order.status)) {
    return {
      id: order.id,
      status: order.status,
      code: order.otpCode,
      message: order.otpMessage,
      expiresAt: order.expiresAt,
      phoneNumber: order.phoneNumber,
    };
  }

  // 15-min auto-refund
  if (order.expiresAt.getTime() < Date.now()) {
    return expireAndRefund(order);
  }

  if (order.providerOrderId) {
    try {
      const sms = await smsAggregator.checkSMS(order.providerKey, order.providerOrderId);
      if (sms.status === "RECEIVED" && sms.code) {
        const updated = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "RECEIVED",
            otpCode: sms.code,
            otpMessage: sms.message,
          },
        });
        return {
          id: updated.id,
          status: updated.status,
          code: updated.otpCode,
          message: updated.otpMessage,
          expiresAt: updated.expiresAt,
          phoneNumber: updated.phoneNumber,
        };
      }
      if (sms.status === "CANCELLED" || sms.status === "EXPIRED") {
        return expireAndRefund(order, sms.status === "CANCELLED" ? "provider_cancelled" : "provider_expired");
      }
    } catch {
      // keep waiting
    }
  }

  return {
    id: order.id,
    status: order.status,
    code: order.otpCode,
    message: order.otpMessage,
    expiresAt: order.expiresAt,
    phoneNumber: order.phoneNumber,
    remainingMs: order.expiresAt.getTime() - Date.now(),
  };
}

async function expireAndRefund(
  order: {
    id: string;
    userId: string;
    price: Prisma.Decimal;
    providerKey: string;
    providerOrderId: string | null;
    phoneNumber: string | null;
    expiresAt: Date;
    refundedAt: Date | null;
  },
  reason = "expired_no_otp",
) {
  // Idempotent: skip if already refunded
  const fresh = await prisma.order.findUnique({ where: { id: order.id } });
  if (!fresh || ["REFUNDED", "RECEIVED", "CANCELLED"].includes(fresh.status)) {
    return {
      id: fresh?.id ?? order.id,
      status: fresh?.status ?? "REFUNDED",
      code: fresh?.otpCode ?? null,
      message: fresh?.otpMessage ?? null,
      expiresAt: fresh?.expiresAt ?? order.expiresAt,
      phoneNumber: fresh?.phoneNumber ?? order.phoneNumber,
    };
  }

  if (order.providerOrderId) {
    await smsAggregator
      .cancel(order.providerKey, order.providerOrderId)
      .catch(() => undefined);
  }

  if (!fresh.refundedAt) {
    await creditWallet(order.userId, order.price, {
      type: "REFUND",
      method: "system",
      externalId: order.id,
      meta: JSON.stringify({ reason, orderId: order.id }),
    });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "REFUNDED",
      refundedAt: fresh.refundedAt ?? new Date(),
      cancelledAt: fresh.cancelledAt ?? new Date(),
    },
  });

  return {
    id: updated.id,
    status: updated.status,
    code: null,
    message: null,
    expiresAt: updated.expiresAt,
    phoneNumber: updated.phoneNumber,
  };
}

/** Cancel + refund if still in ACTIVE/PENDING and within cancel window (or always if force). */
export async function cancelOrder(orderId: string, userId: string, opts?: { force?: boolean }) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  if (!["ACTIVE", "PENDING"].includes(order.status)) {
    throw Object.assign(new Error(`Cannot cancel order in status ${order.status}`), { status: 409 });
  }
  if (order.otpCode) {
    throw Object.assign(new Error("OTP already received"), { status: 409 });
  }

  if (!opts?.force) {
    const cancelWindow = await prisma.setting.findUnique({
      where: { key: "cancel_window_seconds" },
    });
    const windowSec = Number(cancelWindow?.value ?? 120);
    const ageSec = (Date.now() - order.createdAt.getTime()) / 1000;
    if (ageSec > windowSec) {
      throw Object.assign(
        new Error(`Manual cancel only allowed within ${windowSec}s of purchase`),
        { status: 403 },
      );
    }
  }

  if (order.providerOrderId) {
    await smsAggregator.cancel(order.providerKey, order.providerOrderId).catch(() => undefined);
  }

  await creditWallet(userId, order.price, {
    type: "REFUND",
    method: "system",
    externalId: order.id,
    meta: JSON.stringify({ reason: "manual_cancel", orderId: order.id }),
  });

  return prisma.order.update({
    where: { id: order.id },
    data: { status: "REFUNDED", cancelledAt: new Date(), refundedAt: new Date() },
  });
}

/** Cron helper: poll all ACTIVE orders past due or needing SMS check. */
export async function pollActiveOrders(limit = 40) {
  const active = await prisma.order.findMany({
    where: { status: { in: ["ACTIVE", "PENDING"] } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const results = [];
  for (const o of active) {
    results.push(await pollOrder(o.id));
  }
  return results;
}
