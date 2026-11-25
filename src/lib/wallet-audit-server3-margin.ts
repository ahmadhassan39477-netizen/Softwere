import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { decimalJson } from "./money";
import { adjustWalletDebit } from "./wallet";
import {
  isPlausibleOtpRetail,
  isPlausibleOtpWholesale,
  MAX_PLAUSIBLE_OTP_RETAIL_USD,
} from "./sms/otp-price-guards";
import {
  coerceMarkupPercent,
  retailFromWholesale,
} from "./sms/provider-slots";
import { isGmailMailOperator } from "./smsbower-mail";

/** Intended Extra margin after Admin change (retail = wholesale × 1.50). */
export const SERVER3_TARGET_MARKUP_PERCENT = 50;

/** Idempotent ledger prefix — one ADJUSTMENT per user for this audit. */
export const SERVER3_MARGIN_AUDIT_EXTERNAL_PREFIX = "audit:server3-margin:50";

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

function isServer3Order(o: { server: number; providerKey: string }): boolean {
  if (o.server === 3) return true;
  const k = (o.providerKey || "").toLowerCase();
  return k === "smsbower" || k === "sms-man";
}

/**
 * Fair Extra retail at the intended Admin margin (default 50%).
 * Prefer wholesale × (1 + target%); fall back to scaling order.price when
 * wholesale is missing/absurd but charged price looks like old 20–30% markup.
 */
export function expectedServer3Retail(o: {
  price: Prisma.Decimal | string | number;
  wholesaleCost: Prisma.Decimal | string | number;
  targetMarkupPercent?: number;
}): { expected: Prisma.Decimal; source: "wholesale*markup" | "scaled-order.price" | "none" } {
  const target = coerceMarkupPercent(
    o.targetMarkupPercent ?? SERVER3_TARGET_MARKUP_PERCENT,
  );
  const wholesale = d(o.wholesaleCost);
  const price = d(o.price);

  if (isPlausibleOtpWholesale(Number(wholesale))) {
    const fair = new Prisma.Decimal(
      retailFromWholesale(Number(wholesale), target).toFixed(4),
    );
    if (isPlausibleOtpRetail(Number(fair))) {
      return { expected: fair, source: "wholesale*markup" };
    }
  }

  // No fair wholesale — if order.price looks like OTP retail, scale from a
  // common prior markup (30% then 20%) up to the target margin.
  if (isPlausibleOtpRetail(Number(price)) && price.gt(0)) {
    for (const prior of [30, 20]) {
      const wholesaleGuess = Number(price) / (1 + prior / 100);
      if (!isPlausibleOtpWholesale(wholesaleGuess)) continue;
      const fair = new Prisma.Decimal(
        retailFromWholesale(wholesaleGuess, target).toFixed(4),
      );
      if (isPlausibleOtpRetail(Number(fair)) && fair.gt(price)) {
        return { expected: fair, source: "scaled-order.price" };
      }
    }
  }

  return { expected: new Prisma.Decimal(0), source: "none" };
}

export type Server3MarginOrderRow = {
  orderId: string;
  userId: string;
  email: string;
  createdAt: string;
  status: string;
  hasOtp: boolean;
  server: number;
  providerKey: string;
  country: string | null;
  service: string | null;
  orderPrice: string;
  wholesaleCost: string;
  expectedRetail: string;
  expectedSource: "wholesale*markup" | "scaled-order.price" | "none";
  purchaseDebited: string;
  refundCredited: string;
  netCharged: string;
  shortfall: string;
};

export type Server3MarginUserSummary = {
  userId: string;
  email: string;
  orderCount: number;
  underchargedCount: number;
  shortfall: string;
  alreadyCorrected: boolean;
  applied: boolean;
  adjustmentTxnId: string | null;
  shortfallDebited: string;
  balanceBefore: string;
  balanceAfter: string;
};

export type Server3MarginAuditSummary = {
  targetMarkupPercent: number;
  since: string | null;
  applied: boolean;
  slotMarkupPercent: number | null;
  counts: {
    orders: number;
    undercharged: number;
    skippedNoAnchor: number;
    usersTouched: number;
  };
  totals: {
    expectedRetail: string;
    netCharged: string;
    shortfall: string;
    shortfallDebited: string;
  };
  users: Server3MarginUserSummary[];
  underchargedSamples: Server3MarginOrderRow[];
  note: string;
};

/**
 * Audit Server 3 / Extra (SMSBower) orders vs intended Admin margin.
 * Undercharge = max(0, expected@targetMarkup − net PURCHASE+REFUND).
 * apply=true writes one idempotent ADJUSTMENT debit per user (floor ≥ 0).
 */
export async function auditServer3MarginUndercharge(opts: {
  targetMarkupPercent?: number;
  since?: Date | null;
  apply: boolean;
  adminId: string;
  /** Cap samples in response */
  sampleLimit?: number;
}): Promise<Server3MarginAuditSummary> {
  const target = coerceMarkupPercent(
    opts.targetMarkupPercent ?? SERVER3_TARGET_MARKUP_PERCENT,
  );
  const since = opts.since ?? null;
  const sampleLimit = opts.sampleLimit ?? 40;
  const externalIdFor = (userId: string) =>
    `${SERVER3_MARGIN_AUDIT_EXTERNAL_PREFIX}:${userId}`;

  const slot = await prisma.providerSetting.findUnique({
    where: { key: "server-3" },
    select: { markupPercent: true },
  });
  const slotMarkupPercent = slot
    ? coerceMarkupPercent(slot.markupPercent)
    : null;

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { server: 3 },
        { providerKey: { in: ["smsbower", "sms-man"] } },
      ],
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      country: { select: { code: true } },
      service: { select: { slug: true } },
      user: { select: { id: true, email: true, balance: true } },
    },
  });

  const userIds = [...new Set(orders.map((o) => o.userId))];
  const txns =
    userIds.length === 0
      ? []
      : await prisma.transaction.findMany({
          where: { userId: { in: userIds }, status: "COMPLETED" },
          orderBy: { createdAt: "asc" },
        });

  const purchasesByOrder = new Map<string, Prisma.Decimal>();
  const refundsByOrder = new Map<string, Prisma.Decimal>();
  for (const t of txns) {
    if (t.type === "PURCHASE" && t.orderId) {
      purchasesByOrder.set(
        t.orderId,
        (purchasesByOrder.get(t.orderId) ?? new Prisma.Decimal(0)).plus(
          d(t.amount).abs(),
        ),
      );
    }
    if (t.type === "REFUND") {
      const key = refundOrderKey(t);
      if (!key) continue;
      refundsByOrder.set(
        key,
        (refundsByOrder.get(key) ?? new Prisma.Decimal(0)).plus(d(t.amount).abs()),
      );
    }
  }

  const underRows: Server3MarginOrderRow[] = [];
  let expectedTotal = new Prisma.Decimal(0);
  let netChargedTotal = new Prisma.Decimal(0);
  let shortfallTotal = new Prisma.Decimal(0);
  let skippedNoAnchor = 0;
  const shortfallByUser = new Map<
    string,
    { email: string; shortfall: Prisma.Decimal; underCount: number; orderCount: number }
  >();

  for (const o of orders) {
    if (!isServer3Order(o)) continue;
    // Gmails mail path has its own Admin margin + audit — skip here.
    if (isGmailMailOperator(o.operator) || o.country?.code === "GMAIL") continue;

    const userBucket = shortfallByUser.get(o.userId) ?? {
      email: o.user.email,
      shortfall: new Prisma.Decimal(0),
      underCount: 0,
      orderCount: 0,
    };
    userBucket.orderCount += 1;

    const { expected, source } = expectedServer3Retail({
      price: o.price,
      wholesaleCost: o.wholesaleCost,
      targetMarkupPercent: target,
    });
    const purchaseDebited = purchasesByOrder.get(o.id) ?? new Prisma.Decimal(0);
    const refundCredited = refundsByOrder.get(o.id) ?? new Prisma.Decimal(0);
    const netCharged = purchaseDebited.minus(refundCredited);
    const netForCompare = Prisma.Decimal.max(netCharged, new Prisma.Decimal(0));

    if (source === "none" || expected.lte(0) || expected.gt(MAX_PLAUSIBLE_OTP_RETAIL_USD)) {
      skippedNoAnchor += 1;
      shortfallByUser.set(o.userId, userBucket);
      continue;
    }

    expectedTotal = expectedTotal.plus(expected);
    netChargedTotal = netChargedTotal.plus(netForCompare);
    const shortfall = Prisma.Decimal.max(expected.minus(netForCompare), new Prisma.Decimal(0));

    if (shortfall.lte(0)) {
      shortfallByUser.set(o.userId, userBucket);
      continue;
    }

    shortfallTotal = shortfallTotal.plus(shortfall);
    userBucket.shortfall = userBucket.shortfall.plus(shortfall);
    userBucket.underCount += 1;
    shortfallByUser.set(o.userId, userBucket);

    underRows.push({
      orderId: o.id,
      userId: o.userId,
      email: o.user.email,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      hasOtp: Boolean(o.otpCode),
      server: o.server,
      providerKey: o.providerKey,
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
    });
  }

  const note = `Server 3 Extra undercharge vs wholesale×(1+${target}/100); clawback only when Admin apply=true`;

  const userSummaries: Server3MarginUserSummary[] = [];
  let shortfallDebitedTotal = new Prisma.Decimal(0);

  for (const [userId, bucket] of shortfallByUser) {
    if (bucket.shortfall.lte(0) && bucket.underCount === 0) continue;

    const prior = await prisma.transaction.findFirst({
      where: {
        userId,
        type: "ADJUSTMENT",
        externalId: externalIdFor(userId),
        status: "COMPLETED",
      },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const before = d(user.balance);

    let applied = false;
    let adjustmentTxnId: string | null = prior?.id ?? null;
    let after = before;
    let debited = new Prisma.Decimal(0);

    if (prior) {
      userSummaries.push({
        userId,
        email: bucket.email,
        orderCount: bucket.orderCount,
        underchargedCount: bucket.underCount,
        shortfall: "0.0000",
        alreadyCorrected: true,
        applied: false,
        adjustmentTxnId,
        shortfallDebited: "0.0000",
        balanceBefore: money(before),
        balanceAfter: money(before),
      });
      continue;
    }

    if (opts.apply && bucket.shortfall.gt(0)) {
      const result = await adjustWalletDebit(userId, bucket.shortfall, {
        type: "ADJUSTMENT",
        method: "admin_audit",
        externalId: externalIdFor(userId),
        meta: JSON.stringify({
          reason: note,
          email: bucket.email,
          byAdmin: opts.adminId,
          targetMarkupPercent: target,
          shortfall: money(bucket.shortfall),
          underchargedCount: bucket.underCount,
        }),
      });
      applied = !result.idempotent && result.debited.gt(0);
      debited = result.debited;
      after = d(result.balanceAfter);
      adjustmentTxnId = result.transaction?.id ?? null;
      shortfallDebitedTotal = shortfallDebitedTotal.plus(debited);
    }

    userSummaries.push({
      userId,
      email: bucket.email,
      orderCount: bucket.orderCount,
      underchargedCount: bucket.underCount,
      shortfall: money(bucket.shortfall),
      alreadyCorrected: false,
      applied,
      adjustmentTxnId,
      shortfallDebited: money(debited),
      balanceBefore: money(before),
      balanceAfter: money(after),
    });
  }

  userSummaries.sort((a, b) => Number(b.shortfall) - Number(a.shortfall));

  return {
    targetMarkupPercent: target,
    since: since ? since.toISOString() : null,
    applied: opts.apply && shortfallDebitedTotal.gt(0),
    slotMarkupPercent,
    counts: {
      orders: orders.length,
      undercharged: underRows.length,
      skippedNoAnchor,
      usersTouched: userSummaries.filter((u) => u.underchargedCount > 0).length,
    },
    totals: {
      expectedRetail: money(expectedTotal),
      netCharged: money(netChargedTotal),
      shortfall: money(shortfallTotal),
      shortfallDebited: money(shortfallDebitedTotal),
    },
    users: userSummaries,
    underchargedSamples: underRows.slice(0, sampleLimit),
    note,
  };
}

export function server3MarginAuditJson(summary: Server3MarginAuditSummary) {
  return {
    ...summary,
    ok: true,
    decimalCheck: decimalJson(summary.totals.shortfall),
  };
}
