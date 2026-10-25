import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { decimalJson } from "./money";

/** Fixed one-shot target for pre-6413916 double-refund backfill. */
export const WALLET_AUDIT_TARGET_EMAIL = "aqbeds2822@gmail.com";
export const WALLET_AUDIT_EXTERNAL_ID = "audit:double-refund:aqbeds2822";

const REFUNDABLE_ORDER_STATUSES = new Set(["REFUNDED", "CANCELLED", "EXPIRED"]);

function d(v: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  return new Prisma.Decimal(v ?? 0);
}

function money(v: Prisma.Decimal): string {
  return v.toFixed(4);
}

function refundOrderKey(r: {
  orderId: string | null;
  meta: string | null;
}): string | null {
  if (r.orderId) return r.orderId;
  if (!r.meta) return null;
  try {
    const m = JSON.parse(r.meta) as { orderId?: string };
    return m.orderId ?? null;
  } catch {
    return null;
  }
}

export type WalletAuditSummary = {
  email: string;
  userId: string;
  alreadyCorrected: boolean;
  applied: boolean;
  counts: {
    orders: number;
    buys: number;
    successfulOtp: number;
    cancels: number;
    refundLedgerRows: number;
    duplicateRefundOrders: number;
    duplicateRefundRows: number;
    deposits: number;
    legitimateRefunds: number;
  };
  totals: {
    deposits: string;
    charges: string;
    legitimateRefunds: string;
    duplicateRefundAmount: string;
    surplusRemoved: string;
  };
  balance: {
    before: string;
    expected: string;
    after: string;
    surplus: string;
  };
  duplicateOrderIdSamples: string[];
  adjustmentTxnId: string | null;
};

/**
 * Reconstruct expected wallet from deposits − purchases + one refund per
 * cancelled/expired charged order (never credit RECEIVED / OTP-in-hand).
 * When apply=true and balance > expected, write one ADJUSTMENT debit (idempotent).
 */
export async function auditAndCorrectWallet(opts: {
  email?: string;
  apply: boolean;
  adminId: string;
}): Promise<WalletAuditSummary> {
  const targetEmail = (opts.email ?? WALLET_AUDIT_TARGET_EMAIL).toLowerCase().trim();

  let user = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (!user) {
    const rows = await prisma.user.findMany({
      select: { id: true, email: true },
      take: 5000,
    });
    const hit =
      rows.find((u) => u.email.toLowerCase() === targetEmail) ??
      rows.find((u) => u.email.toLowerCase().includes("aqbeds2822"));
    if (!hit) {
      throw Object.assign(new Error(`User not found: ${targetEmail}`), { status: 404 });
    }
    user = await prisma.user.findUniqueOrThrow({ where: { id: hit.id } });
  }

  const prior = await prisma.transaction.findFirst({
    where: {
      userId: user.id,
      type: "ADJUSTMENT",
      externalId: WALLET_AUDIT_EXTERNAL_ID,
      status: "COMPLETED",
    },
  });

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  const txns = await prisma.transaction.findMany({
    where: { userId: user.id, status: "COMPLETED" },
    orderBy: { createdAt: "asc" },
  });

  const purchases = txns.filter((t) => t.type === "PURCHASE");
  const deposits = txns.filter((t) => t.type === "DEPOSIT");
  const refunds = txns.filter((t) => t.type === "REFUND");
  const adjustments = txns.filter((t) => t.type === "ADJUSTMENT");
  const other = txns.filter(
    (t) => !["PURCHASE", "DEPOSIT", "REFUND", "ADJUSTMENT"].includes(t.type),
  );

  const refundsByOrder = new Map<string, typeof refunds>();
  for (const r of refunds) {
    const key = refundOrderKey(r);
    if (!key) continue;
    const list = refundsByOrder.get(key) ?? [];
    list.push(r);
    refundsByOrder.set(key, list);
  }

  const duplicateOrderIds: string[] = [];
  let duplicateRefundRows = 0;
  let duplicateRefundAmount = new Prisma.Decimal(0);
  for (const [oid, list] of refundsByOrder) {
    if (list.length <= 1) continue;
    duplicateOrderIds.push(oid);
    for (const extra of list.slice(1)) {
      duplicateRefundRows += 1;
      duplicateRefundAmount = duplicateRefundAmount.plus(d(extra.amount).abs());
    }
  }

  const depositTotal = deposits.reduce((a, t) => a.plus(d(t.amount)), new Prisma.Decimal(0));
  const adjustmentTotal = adjustments.reduce(
    (a, t) => a.plus(d(t.amount)),
    new Prisma.Decimal(0),
  );
  const otherTotal = other.reduce((a, t) => a.plus(d(t.amount)), new Prisma.Decimal(0));
  const chargesTotal = purchases.reduce(
    (a, t) => a.plus(d(t.amount).abs()),
    new Prisma.Decimal(0),
  );

  const purchaseByOrder = new Set(
    purchases.map((p) => p.orderId).filter((id): id is string => Boolean(id)),
  );

  const successful = orders.filter((o) => o.status === "RECEIVED" || Boolean(o.otpCode));
  const cancelledLike = orders.filter((o) => REFUNDABLE_ORDER_STATUSES.has(o.status));

  let legitimateRefundTotal = new Prisma.Decimal(0);
  let legitimateRefundCount = 0;
  for (const o of orders) {
    const received = o.status === "RECEIVED" || Boolean(o.otpCode);
    if (received) continue;
    const charged = purchaseByOrder.has(o.id) || d(o.price).gt(0);
    const shouldRefund =
      REFUNDABLE_ORDER_STATUSES.has(o.status) || Boolean(o.refundedAt);
    if (charged && shouldRefund) {
      legitimateRefundCount += 1;
      legitimateRefundTotal = legitimateRefundTotal.plus(d(o.price));
    }
  }

  // Expected ignores the pending audit adjustment (prior row already in adjustmentTotal).
  const expected = depositTotal
    .plus(adjustmentTotal)
    .plus(otherTotal)
    .plus(legitimateRefundTotal)
    .minus(chargesTotal);

  const before = d(user.balance);
  const surplus = before.minus(expected);

  const base: WalletAuditSummary = {
    email: user.email,
    userId: user.id,
    alreadyCorrected: Boolean(prior),
    applied: false,
    counts: {
      orders: orders.length,
      buys: purchases.length,
      successfulOtp: successful.length,
      cancels: cancelledLike.length,
      refundLedgerRows: refunds.length,
      duplicateRefundOrders: duplicateOrderIds.length,
      duplicateRefundRows,
      deposits: deposits.length,
      legitimateRefunds: legitimateRefundCount,
    },
    totals: {
      deposits: money(depositTotal),
      charges: money(chargesTotal),
      legitimateRefunds: money(legitimateRefundTotal),
      duplicateRefundAmount: money(duplicateRefundAmount),
      surplusRemoved: "0.0000",
    },
    balance: {
      before: money(before),
      expected: money(expected),
      after: money(before),
      surplus: money(surplus),
    },
    duplicateOrderIdSamples: duplicateOrderIds.slice(0, 15),
    adjustmentTxnId: prior?.id ?? null,
  };

  if (prior) {
    return {
      ...base,
      alreadyCorrected: true,
      balance: {
        ...base.balance,
        after: money(before),
        surplus: "0.0000",
      },
    };
  }

  if (!opts.apply || surplus.lte(0)) {
    return base;
  }

  // Debit ADJUSTMENT for surplus only — leave historical rows intact
  const result = await prisma.$transaction(async (tx) => {
    const again = await tx.transaction.findFirst({
      where: {
        userId: user.id,
        type: "ADJUSTMENT",
        externalId: WALLET_AUDIT_EXTERNAL_ID,
        status: "COMPLETED",
      },
    });
    if (again) {
      const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      return {
        skipped: true as const,
        balanceAfter: d(fresh.balance),
        txnId: again.id,
        removed: new Prisma.Decimal(0),
      };
    }

    const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    const liveBefore = d(fresh.balance);
    const liveSurplus = liveBefore.minus(expected);
    if (liveSurplus.lte(0)) {
      return {
        skipped: true as const,
        balanceAfter: liveBefore,
        txnId: null as string | null,
        removed: new Prisma.Decimal(0),
      };
    }
    const balanceAfter = liveBefore.minus(liveSurplus);
    await tx.user.update({
      where: { id: user.id },
      data: { balance: balanceAfter },
    });
    const txn = await tx.transaction.create({
      data: {
        userId: user.id,
        type: "ADJUSTMENT",
        amount: liveSurplus.negated(),
        balanceAfter,
        method: "admin_audit",
        status: "COMPLETED",
        externalId: WALLET_AUDIT_EXTERNAL_ID,
        meta: JSON.stringify({
          reason: "double-refund audit backfill pre-6413916",
          email: user.email,
          byAdmin: opts.adminId,
          balanceBefore: money(liveBefore),
          expected: money(expected),
          surplusRemoved: money(liveSurplus),
          duplicateOrderIdSamples: duplicateOrderIds.slice(0, 20),
          legitimateRefundCount,
          refundLedgerRows: refunds.length,
        }),
      },
    });
    return {
      skipped: false as const,
      balanceAfter,
      txnId: txn.id,
      removed: liveSurplus,
    };
  });

  return {
    ...base,
    alreadyCorrected: result.skipped && Boolean(result.txnId),
    applied: !result.skipped && result.removed.gt(0),
    totals: {
      ...base.totals,
      surplusRemoved: money(result.removed),
    },
    balance: {
      before: money(before),
      expected: money(expected),
      after: money(result.balanceAfter),
      surplus: money(surplus),
    },
    adjustmentTxnId: result.txnId,
  };
}

export function walletAuditJson(summary: WalletAuditSummary) {
  return {
    ...summary,
    // ensure string decimals for JSON
    balance: summary.balance,
    totals: summary.totals,
    ok: true,
    decimalCheck: decimalJson(summary.balance.after),
  };
}
