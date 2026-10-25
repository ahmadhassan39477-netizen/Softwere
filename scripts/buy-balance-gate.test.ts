/**
 * Balance gate: compare wallet to exact retail only — no ~$0.30 / catalog-min floor.
 * Run: npx tsx scripts/buy-balance-gate.test.ts
 */
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { insufficientBalanceMessage } from "../src/lib/purchase-number";

function canAfford(balance: number, price: string | number): boolean {
  const p = Number(price);
  if (!Number.isFinite(p) || p < 0) return false;
  return balance + 1e-9 >= p;
}

function assertFalseCatalogMinFloor() {
  // Old bug: balance < minServicePrice (or fallback 0.35) blocked ALL buys
  const balance = 0.31;
  const seedCatalogMin = 0.36; // Discord/Facebook seed × 20% often ~0.30–0.36
  const liveCheap = "0.2500";
  const liveExpensive = "0.3500";

  // Must allow cheap live retail even when seed catalog min is higher
  assert.equal(canAfford(balance, liveCheap), true, "0.31 >= 0.25 allow");
  assert.equal(canAfford(balance, liveExpensive), false, "0.31 < 0.35 block");

  // Old catalog-min floor would show global "insufficient" while a cheap OTP is affordable
  const oldGlobalBlocks = balance < seedCatalogMin;
  assert.equal(oldGlobalBlocks, true, "documents old false floor at ~$0.36 seed min");
  assert.equal(
    canAfford(balance, liveCheap),
    true,
    "per-offer gate still allows cheap live OTP under that floor",
  );
}

function assertMessageAmounts() {
  const msg = insufficientBalanceMessage(0.35, 0.31);
  assert.match(msg, /need \$0\.3500/i);
  assert.match(msg, /wallet \$0\.3100/i);
  assert.equal(
    insufficientBalanceMessage(new Prisma.Decimal("0.2500"), "0.3100"),
    "Insufficient balance: need $0.2500, wallet $0.3100",
  );
}

assertFalseCatalogMinFloor();
assertMessageAmounts();
console.log("buy-balance-gate.test.ts: ok");
