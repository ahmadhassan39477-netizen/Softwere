import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * ACID wallet debit/credit inside a Prisma interactive transaction.
 */
export async function debitWallet(
  userId: string,
  amount: Prisma.Decimal | string | number,
  meta: { type: string; method?: string; externalId?: string; meta?: string },
) {
  const debit = new Prisma.Decimal(amount);
  if (debit.lte(0)) throw new Error("Amount must be positive");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (new Prisma.Decimal(user.balance).lt(debit)) {
      throw new Error("Insufficient balance");
    }
    const balanceAfter = new Prisma.Decimal(user.balance).minus(debit);
    await tx.user.update({
      where: { id: userId },
      data: { balance: balanceAfter },
    });
    const txn = await tx.transaction.create({
      data: {
        userId,
        type: meta.type,
        amount: debit.negated(),
        balanceAfter,
        method: meta.method ?? "system",
        status: "COMPLETED",
        externalId: meta.externalId,
        meta: meta.meta,
      },
    });
    return { balanceAfter, transaction: txn };
  });
}

export async function creditWallet(
  userId: string,
  amount: Prisma.Decimal | string | number,
  meta: { type: string; method?: string; status?: string; externalId?: string; meta?: string },
) {
  const credit = new Prisma.Decimal(amount);
  if (credit.lte(0)) throw new Error("Amount must be positive");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const balanceAfter = new Prisma.Decimal(user.balance).plus(credit);
    await tx.user.update({
      where: { id: userId },
      data: { balance: balanceAfter },
    });
    const txn = await tx.transaction.create({
      data: {
        userId,
        type: meta.type,
        amount: credit,
        balanceAfter,
        method: meta.method ?? "system",
        status: meta.status ?? "COMPLETED",
        externalId: meta.externalId,
        meta: meta.meta,
      },
    });
    return { balanceAfter, transaction: txn };
  });
}

const REFUNDABLE_STATUSES = ["ACTIVE", "PENDING", "WAITING"] as const;

/**
 * Idempotent OTP order refund: claim the order once, credit exactly order.price once.
 * Concurrent cancel + auto-expire / double-click share this path — only one ledger credit.
 */
export async function creditOrderRefund(
  orderId: string,
  userId: string,
  meta: { reason: string; method?: string },
) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: {
        id: orderId,
        userId,
        refundedAt: null,
        status: { in: [...REFUNDABLE_STATUSES] },
      },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        cancelledAt: new Date(),
      },
    });

    const order = await tx.order.findFirst({ where: { id: orderId, userId } });
    if (!order) {
      return { credited: false as const, order: null, balanceAfter: null as Prisma.Decimal | null };
    }

    if (claimed.count === 0) {
      return { credited: false as const, order, balanceAfter: null as Prisma.Decimal | null };
    }

    // Belt-and-suspenders: never create a second REFUND ledger row for this order
    const prior = await tx.transaction.findFirst({
      where: { orderId, type: "REFUND", status: "COMPLETED" },
    });
    if (prior) {
      return { credited: false as const, order, balanceAfter: null as Prisma.Decimal | null };
    }

    // Exact charged amount snapshotted on the order at purchase (retail, not wholesale)
    const credit = new Prisma.Decimal(order.price);
    if (credit.lte(0)) {
      throw new Error("Invalid order price for refund");
    }

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const balanceAfter = new Prisma.Decimal(user.balance).plus(credit);
    await tx.user.update({
      where: { id: userId },
      data: { balance: balanceAfter },
    });
    const txn = await tx.transaction.create({
      data: {
        userId,
        orderId,
        type: "REFUND",
        amount: credit,
        balanceAfter,
        method: meta.method ?? "system",
        status: "COMPLETED",
        externalId: `refund:${orderId}`,
        meta: JSON.stringify({ reason: meta.reason, orderId }),
      },
    });

    return { credited: true as const, order, balanceAfter, transaction: txn };
  });
}
