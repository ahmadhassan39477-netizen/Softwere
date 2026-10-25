import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { creditOrderRefund } from "@/lib/wallet";
import { dismissOrderFromServices } from "@/lib/services-panel";
import { smsAggregator } from "./aggregator";

/** Minimum wait window before auto-refund if no SMS (minutes). */
export const DEFAULT_ORDER_TTL_MINUTES = 20;
/** Manual cancel allowed for the full wait window. */
export const DEFAULT_CANCEL_WINDOW_SECONDS = DEFAULT_ORDER_TTL_MINUTES * 60;

/** Effective shop TTL: at least the floor, never below 20 minutes. */
export function resolveOrderTtlMinutes(configured?: string | number | null): number {
  const n = Number(configured ?? DEFAULT_ORDER_TTL_MINUTES);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_ORDER_TTL_MINUTES;
  return Math.max(DEFAULT_ORDER_TTL_MINUTES, Math.floor(n));
}

/** Effective cancel window in seconds — matches wait floor (20 min). */
export function resolveCancelWindowSeconds(configured?: string | number | null): number {
  const n = Number(configured ?? DEFAULT_CANCEL_WINDOW_SECONDS);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_CANCEL_WINDOW_SECONDS;
  return Math.max(DEFAULT_CANCEL_WINDOW_SECONDS, Math.floor(n));
}

/**
 * Poll one active order: check provider SMS, apply wait-window expiry refund.
 * Safe to call from SSE, cron, or client Refresh.
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

  // Auto-refund when wait window elapsed with no SMS
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
        return expireAndRefund(
          order,
          sms.status === "CANCELLED" ? "provider_cancelled" : "provider_expired",
        );
      }
    } catch {
      // keep waiting — never log API keys
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
    expiresAt: Date;
    phoneNumber: string | null;
  },
  reason = "expired_no_otp",
) {
  if (order.providerOrderId) {
    await smsAggregator
      .cancel(order.providerKey, order.providerOrderId)
      .catch(() => undefined);
  }

  // Atomic claim + exact order.price credit (at most once)
  const result = await creditOrderRefund(order.id, order.userId, { reason });
  const updated = result.order;

  return {
    id: updated?.id ?? order.id,
    status: updated?.status ?? "REFUNDED",
    code: updated?.otpCode ?? null,
    message: updated?.otpMessage ?? null,
    expiresAt: updated?.expiresAt ?? order.expiresAt,
    phoneNumber: updated?.phoneNumber ?? order.phoneNumber,
  };
}

/**
 * Cancel from /services panel:
 * - Waiting (no OTP): refund within the wait window (min 20 minutes)
 * - OTP already received: dismiss from /services only (no refund) so the card goes away
 * - Already refunded: idempotent no-op (no second credit)
 */
export async function cancelOrder(orderId: string, userId: string, opts?: { force?: boolean }) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });

  // OTP already in hand — dismiss panel only (keep RECEIVED in Account history)
  if (order.status === "RECEIVED" || order.otpCode) {
    await dismissOrderFromServices(userId, order.id);
    return order;
  }

  // Already refunded (manual or auto) — do not credit again
  if (order.status === "REFUNDED" || order.refundedAt) {
    await dismissOrderFromServices(userId, order.id).catch(() => undefined);
    return order;
  }

  if (!["ACTIVE", "PENDING", "WAITING"].includes(order.status)) {
    throw Object.assign(new Error(`Cannot cancel order in status ${order.status}`), { status: 409 });
  }

  if (!opts?.force) {
    const cancelWindow = await prisma.setting.findUnique({
      where: { key: "cancel_window_seconds" },
    });
    const windowSec = resolveCancelWindowSeconds(cancelWindow?.value);
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

  const result = await creditOrderRefund(order.id, userId, {
    reason: "manual_cancel",
  });

  await dismissOrderFromServices(userId, order.id).catch(() => undefined);

  if (!result.order) {
    throw Object.assign(new Error("Order not found"), { status: 404 });
  }
  return result.order;
}

/** Cron helper: poll all ACTIVE orders past due or needing SMS check. */
export async function pollActiveOrders(limit = 40) {
  const active = await prisma.order.findMany({
    where: { status: { in: ["ACTIVE", "PENDING", "WAITING"] } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const results = [];
  for (const o of active) {
    results.push(await pollOrder(o.id));
  }
  return results;
}
