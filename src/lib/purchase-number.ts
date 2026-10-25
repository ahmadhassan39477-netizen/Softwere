import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AllProvidersFailedError } from "@/lib/sms/types";
import { smsAggregator, serverNumberForProvider } from "@/lib/sms/aggregator";
import { resolveOrderTtlMinutes } from "@/lib/sms/order-lifecycle";
import {
  CUSTOMER_BUY_FAILED,
  CUSTOMER_NO_STOCK,
  CUSTOMER_PROVIDER_BALANCE,
  CUSTOMER_SERVER_UNAVAILABLE,
  sanitizeCustomerBuyError,
} from "@/lib/sms/customer-errors";
import { decimalJson } from "@/lib/money";
import { ensureCatalogSeeded, ensureCountryOffers } from "@/lib/ensure-catalog";
import { worldCountryByCode } from "@/lib/world-countries";

export type PurchaseNumberInput = {
  userId: string;
  countryCode: string;
  serviceSlug: string;
  /** 1 | 2 | 3 | "auto" — Auto failovers Server 1 → 2 → 3 */
  server?: number | "auto";
};

/** Clear customer copy: need exact retail that would be debited vs wallet. */
export function insufficientBalanceMessage(
  need: Prisma.Decimal | string | number,
  wallet: Prisma.Decimal | string | number,
): string {
  const n = new Prisma.Decimal(need).toFixed(4);
  const w = new Prisma.Decimal(wallet).toFixed(4);
  return `Insufficient balance: need $${n}, wallet $${w}`;
}

/**
 * Reserve a number: provider buy first, then debit + order in one DB transaction.
 * Wallet is charged only after a successful provider purchase.
 */
export async function purchaseNumber(input: PurchaseNumberInput) {
  await ensureCatalogSeeded().catch(() => undefined);
  await ensureCountryOffers(input.countryCode).catch(() => undefined);

  const serverMode = input.server === "auto" || input.server === undefined ? "auto" : "fixed";
  const preferredServer =
    typeof input.server === "number" ? input.server : 1;

  let country = await prisma.country.findUnique({
    where: { code: input.countryCode.toUpperCase() },
  });
  if (!country) {
    const w = worldCountryByCode(input.countryCode);
    if (!w) throw Object.assign(new Error("Country unavailable"), { status: 404 });
    country = await prisma.country.create({
      data: {
        code: w.code,
        name: w.name,
        flag: w.flag,
        dialCode: w.dialCode,
        availability: w.availability,
        sortOrder: w.sortOrder,
        enabled: true,
      },
    });
    await ensureCountryOffers(w.code);
  }
  if (!country.enabled) throw Object.assign(new Error("Country unavailable"), { status: 404 });

  const service = await prisma.service.findUnique({
    where: { slug: input.serviceSlug },
  });
  if (!service?.enabled) throw Object.assign(new Error("Service unavailable"), { status: 404 });

  // Resolve retail price from offer (server 1 as base for Auto) or catalog
  let offer = await prisma.serviceOffer.findUnique({
    where: {
      countryId_serviceId_server: {
        countryId: country.id,
        serviceId: service.id,
        server: serverMode === "auto" ? 1 : preferredServer,
      },
    },
  });
  if (!offer?.enabled) {
    offer = await prisma.serviceOffer.findFirst({
      where: { countryId: country.id, serviceId: service.id, enabled: true },
      orderBy: { server: "asc" },
    });
  }
  if (!offer) {
    throw Object.assign(new Error("Out of stock"), { status: 409 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });

  // Apply global / per-user markup on top of offer.price if needed
  const globalMarkup = Number(
    (await prisma.setting.findUnique({ where: { key: "global_markup_percent" } }))?.value ??
      process.env.GLOBAL_PRICE_MARKUP_PERCENT ??
      "20",
  );
  const userMarkup =
    user.markupOverride != null ? Number(user.markupOverride) : globalMarkup;
  // Seed/catalog offer.price is often higher than live retail (wholesale × markup).
  // Do NOT gate on that stale floor (~$0.30+) — it falsely blocks cheap live buys.
  // Soft empty-wallet check only; authoritative gate is chargePrice after provider buy.
  const walletNow = new Prisma.Decimal(user.balance);
  if (!walletNow.isFinite() || walletNow.lt("0.01")) {
    throw Object.assign(
      new Error(insufficientBalanceMessage("0.01", walletNow)),
      { status: 402 },
    );
  }
  const price = new Prisma.Decimal(offer.price);

  const ttlSetting = await prisma.setting.findUnique({ where: { key: "order_ttl_minutes" } });
  const ttlMin = resolveOrderTtlMinutes(ttlSetting?.value);
  let expiresAt = new Date(Date.now() + ttlMin * 60_000);

  let purchase;
  try {
    purchase = await smsAggregator.buy({
      countryCode: country.code,
      serviceSlug: service.slug,
      server: serverMode === "auto" ? "auto" : preferredServer,
    });
  } catch (e) {
    if (e instanceof AllProvidersFailedError) {
      const slotNoKey = e.attempts.some((a) =>
        /SLOT_NO_KEY|MISSING_KEYS/i.test(a.error),
      );
      const slotDisabled = e.attempts.some((a) => /SLOT_DISABLED/i.test(a.error));
      const balanceFail = e.attempts.some((a) =>
        /NO_BALANCE|balance/i.test(a.error),
      );
      const stockFail = e.attempts.some((a) =>
        /NO_NUMBERS|NO_STOCK|UNSUPPORTED|no free|not enough/i.test(a.error),
      );
      // Customer copy only — no env vars, no wholesale brand names, no Admin paste instructions
      const message = slotDisabled || slotNoKey
        ? CUSTOMER_SERVER_UNAVAILABLE
        : balanceFail && !stockFail
          ? CUSTOMER_PROVIDER_BALANCE
          : stockFail || e.attempts.length > 0
            ? CUSTOMER_NO_STOCK
            : CUSTOMER_BUY_FAILED;
      throw Object.assign(new Error(message), {
        status: balanceFail && !stockFail && !slotNoKey && !slotDisabled ? 402 : 409,
        attempts: e.attempts,
      });
    }
    throw Object.assign(
      new Error(
        sanitizeCustomerBuyError(e instanceof Error ? e.message : CUSTOMER_BUY_FAILED),
      ),
      { status: 502 },
    );
  }

  // Honor provider activation deadline when longer than the 20-minute floor
  if (
    purchase.providerExpiresAt instanceof Date &&
    !Number.isNaN(purchase.providerExpiresAt.getTime()) &&
    purchase.providerExpiresAt.getTime() > expiresAt.getTime()
  ) {
    expiresAt = purchase.providerExpiresAt;
  }

  const serverUsed =
    purchase.serverSlot ?? serverNumberForProvider(purchase.providerKey);
  const wholesale = new Prisma.Decimal(purchase.wholesaleCost || offer.costPrice || 0);

  // Exact retail debit = live wholesale × (1 + slotMarkup/100); fallback to catalog offer.
  const slotMarkup = purchase.markupPercent ?? userMarkup ?? 20;
  let chargePrice = price;
  if (Number(wholesale) > 0) {
    const fromWholesale = new Prisma.Decimal(
      (Number(wholesale) * (1 + slotMarkup / 100)).toFixed(4),
    );
    chargePrice = fromWholesale;
  }
  // Re-read wallet — session/UI may be stale after refund/prior buy
  const freshBalance = (
    await prisma.user.findUniqueOrThrow({ where: { id: input.userId } })
  ).balance;
  if (new Prisma.Decimal(freshBalance).lt(chargePrice)) {
    await smsAggregator
      .cancel(purchase.providerKey, purchase.providerOrderId)
      .catch(() => undefined);
    throw Object.assign(
      new Error(insufficientBalanceMessage(chargePrice, freshBalance)),
      { status: 402 },
    );
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
      if (new Prisma.Decimal(fresh.balance).lt(chargePrice)) {
        throw new Error(insufficientBalanceMessage(chargePrice, fresh.balance));
      }
      const balanceAfter = new Prisma.Decimal(fresh.balance).minus(chargePrice);
      await tx.user.update({
        where: { id: input.userId },
        data: { balance: balanceAfter },
      });

      const created = await tx.order.create({
        data: {
          userId: input.userId,
          countryId: country.id,
          serviceId: service.id,
          server: serverUsed,
          serverMode,
          phoneNumber: purchase.phoneNumber,
          status: "ACTIVE",
          price: chargePrice,
          wholesaleCost: wholesale,
          providerOrderId: purchase.providerOrderId,
          providerKey: purchase.providerKey,
          expiresAt,
        },
        include: { country: true, service: true },
      });

      await tx.transaction.create({
        data: {
          userId: input.userId,
          orderId: created.id,
          type: "PURCHASE",
          amount: chargePrice.negated(),
          balanceAfter,
          method: "balance",
          status: "COMPLETED",
          meta: JSON.stringify({
            country: country.code,
            service: service.slug,
            server: serverUsed,
            serverMode,
            provider: purchase.providerKey,
            markupPercent: slotMarkup,
          }),
        },
      });

      await tx.serviceOffer
        .update({
          where: { id: offer.id },
          data: { stock: { decrement: 1 } },
        })
        .catch(() => undefined);

      return created;
    });

    return {
      id: order.id,
      phoneNumber: order.phoneNumber,
      status: order.status,
      price: decimalJson(order.price),
      server: order.server,
      serverMode: order.serverMode,
      expiresAt: order.expiresAt.toISOString(),
      providerKey: order.providerKey,
      country: { code: order.country.code, name: order.country.name, flag: order.country.flag },
      service: { slug: order.service.slug, name: order.service.name },
    };
  } catch (e) {
    await smsAggregator
      .cancel(purchase.providerKey, purchase.providerOrderId)
      .catch(() => undefined);
    throw Object.assign(
      new Error(e instanceof Error ? e.message : "Checkout failed"),
      { status: 402 },
    );
  }
}
