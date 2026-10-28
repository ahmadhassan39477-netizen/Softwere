import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { decimalJson } from "./money";
import { adjustWalletDebit } from "./wallet";
import {
  isPlausibleOtpRetail,
  isPlausibleOtpWholesale,
  MAX_PLAUSIBLE_OTP_RETAIL_USD,
} from "./sms/otp-price-guards";

/** One-shot undercharge clawback for runaway-price / free-OTP window. */
export const UNDERCHARGE_AUDIT_TARGET_EMAIL = "aqbeds2822@gmail.com";
export const UNDERCHARGE_AUDIT_EXTERNAL_ID = "audit:undercharge:aqbeds2822";

const DEFAULT_MARKUP_PERCENT = 20;

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

function isSuccessfulOtp(o: { status: string; otpCode: string | null }): boolean {
  return o.status === "RECEIVED" || Boolean(o.otpCode);
}

/**
 * Expected retail for a successful OTP:
 * - Prefer order.price when it is a plausible OTP retail.
 * - Else wholesaleCost × (1 + 20% markup) when wholesale is plausible.
 * - Else 0 (cannot assert undercharge without a fair anchor).
 */
export function expectedRetailForOrder(o: {
  price: Prisma.Decimal | string | number;
  wholesaleCost: Prisma.Decimal | string | number;
  markupPercent?: number;
}): { expected: Prisma.Decimal; source: "order.price" | "wholesale*markup" | "none" } {
  const price = d(o.price);
  const wholesale = d(o.wholesaleCost);
  const markup =
    o.markupPercent != null && Number.isFinite(o.markupPercent) && o.markupPercent >= 0
      ? o.markupPercent
      : DEFAULT_MARKUP_PERCENT;

  const fairFromWholesale = isPlausibleOtpWholesale(Number(wholesale))
    ? new Prisma.Decimal((Number(wholesale) * (1 + markup / 100)).toFixed(4))
    : null;

  if (isPlausibleOtpRetail(Number(price))) {
    // If stored price is far below live-fair wholesale markup, use the higher fair.
    if (fairFromWholesale && price.lt(fairFromWholesale.mul("0.5"))) {
      return { expected: fairFromWholesale, source: "wholesale*markup" };
    }
    return { expected: price, source: "order.price" };
  }

  if (fairFromWholesale && isPlausibleOtpRetail(Number(fairFromWholesale))) {
    return { expected: fairFromWholesale, source: "wholesale*markup" };
  }

  return { expected: new Prisma.Decimal(0), source: "none" };
}

export type UnderchargeOrderRow = {
  orderId: string;
  status: string;
  hasOtp: boolean;
  server: number;
  country: string | null;
  service: string | null;
  orderPrice: string;
  wholesaleCost: string;
  expectedRetail: string;
  expectedSource: "order.price" | "wholesale*markup" | "none";
  purchaseDebited: string;
  refundCredited: string;
  netCharged: string;
  shortfall: string;
  reason: string | null;
};

export type UnderchargeAuditSummary = {
  email: string;
  userId: string;
  alreadyCorrected: boolean;
  applied: boolean;
  counts: {
    orders: number;
    successfulOtp: number;
    undercharged: number;
    freeOtp: number;
    skippedNoAnchor: number;
  };
  totals: {
    expectedRetail: string;
    netCharged: string;
    shortfall: string;
    shortfallDebited: string;
  };
  balance: {
    before: string;
    after: string;
  };
  underchargedSamples: UnderchargeOrderRow[];
  adjustmentTxnId: string | null;
  note: string;
};

/**
 * Audit successful OTPs only: compare net ledger charge vs expected retail.
 * Shortfall = max(0, expected − (PURCHASE debits − REFUND credits)).
 * apply=true writes one idempotent ADJUSTMENT debit (floor balance ≥ 0).
 */
export async function auditUnderchargeSuccessfulOtps(opts: {
  email?: string;
  apply: boolean;
  adminId: string;
}): Promise<UnderchargeAuditSummary> {
  const targetEmail = (opts.email ?? UNDERCHARGE_AUDIT_TARGET_EMAIL).toLowerCase().trim();

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
      externalId: UNDERCHARGE_AUDIT_EXTERNAL_ID,
      status: "COMPLETED",
    },
  });

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      country: { select: { code: true } },
      service: { select: { slug: true } },
    },
  });
  const txns = await prisma.transaction.findMany({
    where: { userId: user.id, status: "COMPLETED" },
    orderBy: { createdAt: "asc" },
  });

  const purchasesByOrder = new Map<string, Prisma.Decimal>();
  for (const t of txns) {
    if (t.type !== "PURCHASE" || !t.orderId) continue;
    purchasesByOrder.set(
      t.orderId,
      (purchasesByOrder.get(t.orderId) ?? new Prisma.Decimal(0)).plus(d(t.amount).abs()),
    );
  }

  const refundsByOrder = new Map<string, Prisma.Decimal>();
  for (const t of txns) {
    if (t.type !== "REFUND") continue;
    const key = refundOrderKey(t);
    if (!key) continue;
    refundsByOrder.set(
      key,
      (refundsByOrder.get(key) ?? new Prisma.Decimal(0)).plus(d(t.amount).abs()),
    );
  }

  const successful = orders.filter(isSuccessfulOtp);
  const underRows: UnderchargeOrderRow[] = [];
  let expectedTotal = new Prisma.Decimal(0);
  let netChargedTotal = new Prisma.Decimal(0);
  let shortfallTotal = new Prisma.Decimal(0);
  let freeOtp = 0;
  let skippedNoAnchor = 0;

  for (const o of successful) {
    const { expected, source } = expectedRetailForOrder(o);
    const purchaseDebited = purchasesByOrder.get(o.id) ?? new Prisma.Decimal(0);
    const refundCredited = refundsByOrder.get(o.id) ?? new Prisma.Decimal(0);
    const netCharged = purchaseDebited.minus(refundCredited);
    // Net cannot count negative toward "overpaid" for this audit — undercharge only.
    const netForCompare = Prisma.Decimal.max(netCharged, new Prisma.Decimal(0));

    if (source === "none" || expected.lte(0) || expected.gt(MAX_PLAUSIBLE_OTP_RETAIL_USD)) {
      skippedNoAnchor += 1;
      continue;
    }

    expectedTotal = expectedTotal.plus(expected);
    netChargedTotal = netChargedTotal.plus(netForCompare);
    const shortfall = Prisma.Decimal.max(expected.minus(netForCompare), new Prisma.Decimal(0));

    if (shortfall.lte(0)) continue;

    shortfallTotal = shortfallTotal.plus(shortfall);
    const isFree = netForCompare.lte(0);
    if (isFree) freeOtp += 1;

    let reason: string;
    if (isFree && refundCredited.gt(0)) {
      reason = "successful OTP refunded (net free)";
    } else if (isFree) {
      reason = "successful OTP with no PURCHASE debit";
    } else if (source === "wholesale*markup") {
      reason = "debited below wholesale×1.20 fair retail";
    } else {
      reason = "debited below order.price retail";
    }

    underRows.push({
      orderId: o.id,
      status: o.status,
      hasOtp: Boolean(o.otpCode),
      server: o.server,
      country: o.country?.code ?? null,
      service: o.service?.slug ?? null,
      orderPrice: money(d(o.price)),
      wholesaleCost: money(d(o.wholesaleCost)),
      expectedRetail: money(expected),
      expectedSource: source,
      purchaseDebited: money(purchaseDebited),
      refundCredited: money(refundCredited),
      netCharged: money(netCharged),
      shortfall: money(shortfall),
      reason,
    });
  }

  const before = d(user.balance);
  const note =
    "undercharge audit: successful OTP shortfall vs order.price / wholesale×1.20 (runaway-price window)";

  const base: UnderchargeAuditSummary = {
    email: user.email,
    userId: user.id,
    alreadyCorrected: Boolean(prior),
    applied: false,
    counts: {
      orders: orders.length,
      successfulOtp: successful.length,
      undercharged: underRows.length,
      freeOtp,
      skippedNoAnchor,
    },
    totals: {
      expectedRetail: money(expectedTotal),
      netCharged: money(netChargedTotal),
      shortfall: money(shortfallTotal),
      shortfallDebited: "0.0000",
    },
    balance: {
      before: money(before),
      after: money(before),
    },
    underchargedSamples: underRows.slice(0, 40),
    adjustmentTxnId: prior?.id ?? null,
    note,
  };

  if (prior) {
    return {
      ...base,
      alreadyCorrected: true,
      totals: {
        ...base.totals,
        // Historical shortfall already clawed; do not restate as pending.
        shortfall: "0.0000",
      },
    };
  }

  if (!opts.apply || shortfallTotal.lte(0)) {
    return base;
  }

  const result = await adjustWalletDebit(user.id, shortfallTotal, {
    type: "ADJUSTMENT",
    method: "admin_audit",
    externalId: UNDERCHARGE_AUDIT_EXTERNAL_ID,
    meta: JSON.stringify({
      reason: note,
      email: user.email,
      byAdmin: opts.adminId,
      balanceBefore: money(before),
      shortfall: money(shortfallTotal),
      underchargedCount: underRows.length,
      freeOtp,
      orderIdSamples: underRows.slice(0, 25).map((r) => r.orderId),
    }),
  });

  return {
    ...base,
    alreadyCorrected: Boolean(result.idempotent),
    applied: !result.idempotent && result.debited.gt(0),
    totals: {
      ...base.totals,
      shortfallDebited: money(result.debited),
    },
    balance: {
      before: money(before),
      after: money(result.balanceAfter),
    },
    adjustmentTxnId: result.transaction ? result.transaction.id : null,
  };
}

export function underchargeAuditJson(summary: UnderchargeAuditSummary) {
  return {
    ...summary,
    ok: true,
    decimalCheck: decimalJson(summary.balance.after),
  };
}
