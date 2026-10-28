import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalJson } from "@/lib/money";
import { insufficientBalanceMessage } from "@/lib/purchase-number";
import { listGmailOffers, loadSmsBowerMailCreds } from "@/lib/gmail-catalog";
import {
  buyMailActivation,
  GMAIL_COUNTRY_CODE,
  GMAIL_NETWORK_LABEL,
  GMAIL_OPERATOR,
  GMAIL_TTL_MINUTES,
  retailFromGmailWholesale,
} from "@/lib/smsbower-mail";
import {
  CUSTOMER_BUY_FAILED,
  CUSTOMER_GMAIL_NO_STOCK,
  CUSTOMER_PROVIDER_BALANCE,
  CUSTOMER_SERVER_UNAVAILABLE,
  sanitizeCustomerBuyError,
} from "@/lib/sms/customer-errors";

export type PurchaseGmailInput = {
  userId: string;
  serviceSlug: string;
};

async function ensureGmailCountry() {
  const existing = await prisma.country.findUnique({ where: { code: GMAIL_COUNTRY_CODE } });
  if (existing) return existing;
  return prisma.country.create({
    data: {
      code: GMAIL_COUNTRY_CODE,
      name: "Gmail",
      flag: "✉️",
      dialCode: "",
      availability: 0,
      sortOrder: 9999,
      enabled: true,
    },
  });
}

async function ensureService(slug: string, fallbackName: string) {
  const existing = await prisma.service.findUnique({ where: { slug } });
  if (existing) return existing;
  return prisma.service.create({
    data: {
      slug,
      name: fallbackName,
      category: "Gmails",
      enabled: true,
    },
  });
}

/**
 * Buy a temporary @gmail.com address for a target service via Server 3 mail API.
 * Wallet charged only after wholesale activation succeeds. Retail = wholesale × 1.40.
 */
export async function purchaseGmail(input: PurchaseGmailInput) {
  const creds = await loadSmsBowerMailCreds();
  if (!creds.ready) {
    throw Object.assign(new Error(CUSTOMER_SERVER_UNAVAILABLE), { status: 503 });
  }

  const catalog = await listGmailOffers();
  const offer = catalog.offers.find(
    (o) => o.serviceSlug.toLowerCase() === input.serviceSlug.toLowerCase(),
  );
  if (!offer || offer.stock <= 0) {
    throw Object.assign(new Error(CUSTOMER_GMAIL_NO_STOCK), { status: 409 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });
  const walletNow = new Prisma.Decimal(user.balance);
  if (!walletNow.isFinite() || walletNow.lt("0.01")) {
    throw Object.assign(new Error(insufficientBalanceMessage("0.01", walletNow)), {
      status: 402,
    });
  }

  const country = await ensureGmailCountry();
  const service = await ensureService(offer.serviceSlug, offer.serviceName);

  let activation;
  try {
    activation = await buyMailActivation(creds.apiKey, {
      serviceCode: offer.serviceCode,
      domain: offer.domain,
      maxPrice: offer.maxPrice,
      handlerBaseUrl: creds.handlerBaseUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "buy_failed";
    if (/NO_BALANCE/i.test(msg)) {
      throw Object.assign(new Error(CUSTOMER_PROVIDER_BALANCE), { status: 503 });
    }
    if (/NO_STOCK|No mails/i.test(msg)) {
      throw Object.assign(new Error(CUSTOMER_GMAIL_NO_STOCK), { status: 409 });
    }
    throw Object.assign(new Error(sanitizeCustomerBuyError(msg) || CUSTOMER_BUY_FAILED), {
      status: 502,
    });
  }

  const wholesale =
    activation.wholesaleCost > 0 ? activation.wholesaleCost : offer.wholesale;
  const retail = retailFromGmailWholesale(wholesale);
  const chargePrice = new Prisma.Decimal(retail.toFixed(4));

  if (walletNow.lt(chargePrice)) {
    // Soft cancel wholesale so we do not leave a dangling mail activation
    const { setMailStatus } = await import("@/lib/smsbower-mail");
    await setMailStatus(creds.apiKey, activation.mailId, 2, creds.handlerBaseUrl).catch(
      () => undefined,
    );
    throw Object.assign(new Error(insufficientBalanceMessage(chargePrice, walletNow)), {
      status: 402,
    });
  }

  const expiresAt = new Date(Date.now() + GMAIL_TTL_MINUTES * 60_000);

  try {
    const order = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
      if (new Prisma.Decimal(fresh.balance).lt(chargePrice)) {
        throw Object.assign(new Error(insufficientBalanceMessage(chargePrice, fresh.balance)), {
          status: 402,
        });
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
          server: 3,
          serverMode: "fixed",
          phoneNumber: activation.email,
          status: "ACTIVE",
          price: chargePrice,
          wholesaleCost: new Prisma.Decimal(wholesale.toFixed(4)),
          providerOrderId: activation.mailId,
          providerKey: "smsbower",
          operator: GMAIL_OPERATOR,
          networkLabel: GMAIL_NETWORK_LABEL,
          expiresAt,
        },
        include: {
          country: { select: { code: true, name: true, flag: true } },
          service: { select: { slug: true, name: true } },
        },
      });
      await tx.transaction.create({
        data: {
          userId: input.userId,
          orderId: created.id,
          type: "PURCHASE",
          amount: chargePrice.negated(),
          balanceAfter,
          method: "system",
          status: "COMPLETED",
          meta: JSON.stringify({ kind: "gmail", domain: offer.domain }),
        },
      });
      return created;
    });

    return {
      order: {
        id: order.id,
        phoneNumber: order.phoneNumber,
        status: order.status,
        price: decimalJson(order.price),
        server: order.server,
        serverMode: order.serverMode,
        expiresAt: order.expiresAt.toISOString(),
        country: order.country,
        service: order.service,
        otpCode: order.otpCode,
        otpMessage: order.otpMessage,
        networkLabel: order.networkLabel,
        operator: order.operator,
        kind: "gmail" as const,
      },
    };
  } catch (e) {
    const { setMailStatus } = await import("@/lib/smsbower-mail");
    await setMailStatus(creds.apiKey, activation.mailId, 2, creds.handlerBaseUrl).catch(
      () => undefined,
    );
    if ((e as { status?: number })?.status === 402) throw e;
    throw Object.assign(
      new Error(sanitizeCustomerBuyError(e instanceof Error ? e.message : CUSTOMER_BUY_FAILED)),
      { status: 500 },
    );
  }
}
