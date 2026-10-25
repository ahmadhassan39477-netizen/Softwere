/**
 * Wallet refund idempotency — buy N → cancel all → balance back to start;
 * concurrent cancel+expire still credits once.
 *
 * Run:
 *   DATABASE_URL="file:./prisma/test-wallet-refund.db" npx tsx scripts/wallet-refund-idempotency.test.ts
 */
import assert from "node:assert/strict";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { Prisma, PrismaClient } from "@prisma/client";

const dbFile = resolve(process.cwd(), "prisma/test-wallet-refund.db");
process.env.DATABASE_URL = `file:${dbFile}`;
process.env.USE_MOCK_PROVIDERS = "true";

if (existsSync(dbFile)) unlinkSync(dbFile);

const push = spawnSync(
  "npx",
  ["prisma", "db", "push", "--schema=prisma/schema.prisma", "--skip-generate", "--accept-data-loss"],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: `file:${dbFile}` } },
);
assert.equal(push.status, 0, "prisma db push failed");

const prisma = new PrismaClient();

async function seedCatalog(prismaClient: PrismaClient) {
  const country = await prismaClient.country.upsert({
    where: { code: "US" },
    update: {},
    create: {
      code: "US",
      name: "United States",
      flag: "🇺🇸",
      dialCode: "+1",
          availability: 100,
          sortOrder: 1,
      enabled: true,
    },
  });
  const service = await prismaClient.service.upsert({
    where: { slug: "whatsapp" },
    update: {},
    create: {
      slug: "whatsapp",
      name: "WhatsApp",
      category: "messaging",
      enabled: true,
    },
  });
  return { country, service };
}

async function createChargedOrder(
  prismaClient: PrismaClient,
  opts: {
    userId: string;
    countryId: string;
    serviceId: string;
    price: Prisma.Decimal;
    status?: string;
    otpCode?: string | null;
    expiresAt?: Date;
  },
) {
  const price = opts.price;
  const order = await prismaClient.$transaction(async (tx) => {
    const fresh = await tx.user.findUniqueOrThrow({ where: { id: opts.userId } });
    if (new Prisma.Decimal(fresh.balance).lt(price)) throw new Error("Insufficient balance");
    const balanceAfter = new Prisma.Decimal(fresh.balance).minus(price);
    await tx.user.update({ where: { id: opts.userId }, data: { balance: balanceAfter } });
    const created = await tx.order.create({
      data: {
        userId: opts.userId,
        countryId: opts.countryId,
        serviceId: opts.serviceId,
        server: 1,
        serverMode: "fixed",
        phoneNumber: `+1555${Math.floor(Math.random() * 1e7)
          .toString()
          .padStart(7, "0")}`,
        status: opts.status ?? "ACTIVE",
        price,
        wholesaleCost: price.div(1.2).toDecimalPlaces(4),
        providerOrderId: `mock_${Math.random().toString(36).slice(2, 10)}`,
        providerKey: "mock",
        otpCode: opts.otpCode ?? null,
        expiresAt: opts.expiresAt ?? new Date(Date.now() + 20 * 60_000),
      },
    });
    await tx.transaction.create({
      data: {
        userId: opts.userId,
        orderId: created.id,
        type: "PURCHASE",
        amount: price.negated(),
        balanceAfter,
        method: "balance",
        status: "COMPLETED",
      },
    });
    return created;
  });
  return order;
}

async function main() {
  // Dynamic import after DATABASE_URL is set so lib/prisma picks up the test db
  const { creditOrderRefund } = await import("../src/lib/wallet");
  const { cancelOrder, pollOrder } = await import("../src/lib/sms/order-lifecycle");

  const { country, service } = await seedCatalog(prisma);

  // --- 1) Balance invariance: B → buy N totaling C → cancel all → back to B ---
  const start = new Prisma.Decimal("5.0000");
  const user = await prisma.user.create({
    data: {
      email: `refund-test-${Date.now()}@example.com`,
      balance: start,
      role: "USER",
    },
  });

  const prices = ["0.5000", "0.7500", "1.0000", "0.2500"].map((p) => new Prisma.Decimal(p));
  const orders = [];
  for (const price of prices) {
    orders.push(
      await createChargedOrder(prisma, {
        userId: user.id,
        countryId: country.id,
        serviceId: service.id,
        price,
      }),
    );
  }

  const afterBuys = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const charged = prices.reduce((a, b) => a.plus(b), new Prisma.Decimal(0));
  assert.equal(
    new Prisma.Decimal(afterBuys.balance).toFixed(4),
    start.minus(charged).toFixed(4),
    "balance after buys",
  );

  for (const o of orders) {
    await cancelOrder(o.id, user.id, { force: true });
  }

  const afterCancel = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(
    new Prisma.Decimal(afterCancel.balance).toFixed(4),
    start.toFixed(4),
    "balance after cancel-all must equal start",
  );

  const refundRows = await prisma.transaction.count({
    where: { userId: user.id, type: "REFUND", status: "COMPLETED" },
  });
  assert.equal(refundRows, orders.length, "one REFUND ledger row per order");

  // --- 2) Cancel already-refunded: no second credit ---
  const balBefore = new Prisma.Decimal(afterCancel.balance);
  await cancelOrder(orders[0].id, user.id, { force: true });
  await creditOrderRefund(orders[0].id, user.id, { reason: "retry" });
  const afterIdempotent = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(
    new Prisma.Decimal(afterIdempotent.balance).toFixed(4),
    balBefore.toFixed(4),
    "idempotent re-cancel must not credit again",
  );

  // --- 3) Cancel after OTP received: no credit ---
  const user2 = await prisma.user.create({
    data: {
      email: `refund-recv-${Date.now()}@example.com`,
      balance: new Prisma.Decimal("3.0000"),
      role: "USER",
    },
  });
  const receivedOrder = await createChargedOrder(prisma, {
    userId: user2.id,
    countryId: country.id,
    serviceId: service.id,
    price: new Prisma.Decimal("1.2500"),
    status: "RECEIVED",
    otpCode: "123456",
  });
  const beforeRecv = await prisma.user.findUniqueOrThrow({ where: { id: user2.id } });
  const dismissed = await cancelOrder(receivedOrder.id, user2.id, { force: true });
  assert.equal(dismissed.status, "RECEIVED");
  const afterRecv = await prisma.user.findUniqueOrThrow({ where: { id: user2.id } });
  assert.equal(
    new Prisma.Decimal(afterRecv.balance).toFixed(4),
    new Prisma.Decimal(beforeRecv.balance).toFixed(4),
    "RECEIVED cancel must not refund",
  );
  const recvRefunds = await prisma.transaction.count({
    where: { orderId: receivedOrder.id, type: "REFUND" },
  });
  assert.equal(recvRefunds, 0);

  // --- 4) Concurrent double-cancel + expire path: still one credit ---
  const user3 = await prisma.user.create({
    data: {
      email: `refund-race-${Date.now()}@example.com`,
      balance: new Prisma.Decimal("4.0000"),
      role: "USER",
    },
  });
  const racePrice = new Prisma.Decimal("0.8000");
  const raceOrder = await createChargedOrder(prisma, {
    userId: user3.id,
    countryId: country.id,
    serviceId: service.id,
    price: racePrice,
    expiresAt: new Date(Date.now() - 1000), // already past TTL for poll expire
  });
  const start3 = new Prisma.Decimal("4.0000");

  const [r1, r2, r3] = await Promise.all([
    cancelOrder(raceOrder.id, user3.id, { force: true }),
    cancelOrder(raceOrder.id, user3.id, { force: true }),
    pollOrder(raceOrder.id),
  ]);
  assert.ok(r1);
  assert.ok(r2);
  assert.ok(r3);

  const afterRace = await prisma.user.findUniqueOrThrow({ where: { id: user3.id } });
  assert.equal(
    new Prisma.Decimal(afterRace.balance).toFixed(4),
    start3.toFixed(4),
    "concurrent cancel/expire must restore exact start balance (one credit)",
  );
  const raceRefunds = await prisma.transaction.count({
    where: { orderId: raceOrder.id, type: "REFUND", status: "COMPLETED" },
  });
  assert.equal(raceRefunds, 1, "exactly one REFUND row under race");

  console.log("wallet-refund-idempotency: all assertions passed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (existsSync(dbFile)) unlinkSync(dbFile);
  });
