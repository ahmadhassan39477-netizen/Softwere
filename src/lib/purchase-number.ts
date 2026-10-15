import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { purchaseWithFallback, providerForKey } from "@/lib/providers/sms";
import { decimalJson } from "@/lib/money";

export type PurchaseNumberInput = {
  userId: string;
  countryCode: string;
  serviceSlug: string;
  server?: number;
};

/**
 * Reserve a number: provider first, then debit + order in one DB transaction.
 * Wallet is charged only after a successful provider purchase.
 */
export async function purchaseNumber(input: PurchaseNumberInput) {
  const server = input.server ?? 1;
  const country = await prisma.country.findUnique({
    where: { code: input.countryCode.toUpperCase() },
  });
  if (!country?.enabled) throw Object.assign(new Error("Country unavailable"), { status: 404 });

  const service = await prisma.service.findUnique({
    where: { slug: input.serviceSlug },
  });
  if (!service?.enabled) throw Object.assign(new Error("Service unavailable"), { status: 404 });

  const offer = await prisma.serviceOffer.findUnique({
    where: {
      countryId_serviceId_server: {
        countryId: country.id,
        serviceId: service.id,
        server,
      },
    },
  });
  if (!offer?.enabled || offer.stock <= 0) {
    throw Object.assign(new Error("Out of stock"), { status: 409 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });
  const price = new Prisma.Decimal(offer.price);
  if (new Prisma.Decimal(user.balance).lt(price)) {
    throw Object.assign(new Error("Insufficient balance"), { status: 402 });
  }

  const ttlSetting = await prisma.setting.findUnique({ where: { key: "order_ttl_minutes" } });
  const ttlMin = Number(ttlSetting?.value ?? 15);
  const expiresAt = new Date(Date.now() + ttlMin * 60_000);

  let purchase;
  try {
    purchase = await purchaseWithFallback({
      countryCode: country.code,
      serviceSlug: service.slug,
      server,
    });
  } catch (e) {
    throw Object.assign(
      new Error(e instanceof Error ? e.message : "Provider error"),
      { status: 502 },
    );
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
      if (new Prisma.Decimal(fresh.balance).lt(price)) {
        throw new Error("Insufficient balance");
      }
      const balanceAfter = new Prisma.Decimal(fresh.balance).minus(price);
      await tx.user.update({
        where: { id: input.userId },
        data: { balance: balanceAfter },
      });
      await tx.transaction.create({
        data: {
          userId: input.userId,
          type: "PURCHASE",
          amount: price.negated(),
          balanceAfter,
          method: "balance",
          status: "COMPLETED",
          meta: JSON.stringify({
            country: country.code,
            service: service.slug,
            server,
            provider: purchase.providerKey,
          }),
        },
      });
      await tx.serviceOffer.update({
        where: { id: offer.id },
        data: { stock: { decrement: 1 } },
      });
      return tx.order.create({
        data: {
          userId: input.userId,
          countryId: country.id,
          serviceId: service.id,
          server,
          phoneNumber: purchase.phoneNumber,
          status: "ACTIVE",
          price: offer.price,
          providerOrderId: purchase.providerOrderId,
          providerKey: purchase.providerKey,
          expiresAt,
        },
        include: { country: true, service: true },
      });
    });

    return {
      id: order.id,
      phoneNumber: order.phoneNumber,
      status: order.status,
      price: decimalJson(order.price),
      server: order.server,
      expiresAt: order.expiresAt.toISOString(),
      providerKey: order.providerKey,
      country: { code: order.country.code, name: order.country.name, flag: order.country.flag },
      service: { slug: order.service.slug, name: order.service.name },
    };
  } catch (e) {
    // Best-effort cancel at provider if DB debit failed after number issued
    await providerForKey(purchase.providerKey)
      .cancel(purchase.providerOrderId)
      .catch(() => undefined);
    throw Object.assign(
      new Error(e instanceof Error ? e.message : "Checkout failed"),
      { status: 402 },
    );
  }
}
