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
