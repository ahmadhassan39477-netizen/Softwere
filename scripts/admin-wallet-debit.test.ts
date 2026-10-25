/**
 * Admin debit clamps at $0 and is idempotent on externalId.
 * Run: npx tsx scripts/admin-wallet-debit.test.ts
 */
import assert from "node:assert/strict";
import { PrismaClient, Prisma } from "@prisma/client";
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.join(process.cwd(), "prisma", "test-admin-debit.db");
const url = `file:${dbPath}`;
process.env.DATABASE_URL = url;

if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
execSync(`npx prisma db push --schema=prisma/schema.prisma --skip-generate`, {
  env: { ...process.env, DATABASE_URL: url },
  stdio: "pipe",
});

const prisma = new PrismaClient();

async function main() {
  // Dynamic import after DATABASE_URL is set
  const { adjustWalletDebit, creditWallet } = await import("../src/lib/wallet");

  const user = await prisma.user.create({
    data: {
      email: `debit-test-${Date.now()}@example.com`,
      passwordHash: "x",
      balance: new Prisma.Decimal("1.2500"),
    },
  });

  const cut = await adjustWalletDebit(user.id, 0.4, {
    type: "ADJUSTMENT",
    method: "admin_debit",
    externalId: "test:debit:once",
    meta: JSON.stringify({ note: "mistake top-up", byAdmin: "test" }),
  });
  assert.equal(cut.idempotent, false);
  assert.equal(cut.clamped, false);
  assert.equal(cut.debited.toFixed(4), "0.4000");
  assert.equal(cut.balanceAfter.toFixed(4), "0.8500");

  const again = await adjustWalletDebit(user.id, 0.4, {
    type: "ADJUSTMENT",
    method: "admin_debit",
    externalId: "test:debit:once",
  });
  assert.equal(again.idempotent, true);
  assert.equal(again.debited.toFixed(4), "0.0000");
  assert.equal(again.balanceAfter.toFixed(4), "0.8500");

  const over = await adjustWalletDebit(user.id, 5, {
    type: "ADJUSTMENT",
    method: "admin_debit",
    externalId: "test:debit:clamp",
  });
  assert.equal(over.clamped, true);
  assert.equal(over.debited.toFixed(4), "0.8500");
  assert.equal(over.balanceAfter.toFixed(4), "0.0000");

  // credit still works
  const top = await creditWallet(user.id, 0.5, {
    type: "DEPOSIT",
    method: "whatsapp_manual",
  });
  assert.equal(top.balanceAfter.toFixed(4), "0.5000");

  // wallet-audit-correct module still importable (must not be removed)
  const audit = await import("../src/lib/wallet-audit-correct");
  assert.ok(typeof audit.auditAndCorrectWallet === "function");

  console.log("admin-wallet-debit.test.ts: ok");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
