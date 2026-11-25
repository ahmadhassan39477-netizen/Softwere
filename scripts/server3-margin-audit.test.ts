/**
 * Unit tests for Server 3 Extra margin helpers (no DB).
 * Run: npx tsx scripts/server3-margin-audit.test.ts
 */
import assert from "node:assert/strict";
import {
  coerceMarkupPercent,
  retailFromWholesale,
} from "../src/lib/sms/provider-slots";
import { expectedServer3Retail } from "../src/lib/wallet-audit-server3-margin";

function main() {
  assert.equal(coerceMarkupPercent(50), 50);
  assert.equal(coerceMarkupPercent("30"), 30);
  assert.equal(coerceMarkupPercent(-1), 20);
  assert.equal(coerceMarkupPercent(null), 20);
  assert.equal(retailFromWholesale(1, 50), 1.5);
  assert.equal(retailFromWholesale(0.1, 30), 0.13);
  assert.equal(retailFromWholesale(0.072, 20), 0.0864);

  // wholesale × 1.50
  const fair = expectedServer3Retail({
    price: "0.0936",
    wholesaleCost: "0.0720",
    targetMarkupPercent: 50,
  });
  assert.equal(fair.source, "wholesale*markup");
  assert.equal(fair.expected.toFixed(4), "0.1080");

  // Charged at 30% while 50% intended → shortfall path uses wholesale×1.50
  const under = expectedServer3Retail({
    price: "0.0936", // 0.072 × 1.30
    wholesaleCost: "0.0720",
    targetMarkupPercent: 50,
  });
  assert.equal(under.expected.toFixed(4), "0.1080");
  assert.ok(Number(under.expected) > Number("0.0936"));

  // Absurd provider-id wholesale → scale from prior 30% price
  const scaled = expectedServer3Retail({
    price: "0.1300", // looks like 0.10 × 1.30
    wholesaleCost: "2266",
    targetMarkupPercent: 50,
  });
  assert.equal(scaled.source, "scaled-order.price");
  assert.equal(scaled.expected.toFixed(4), "0.1500");

  // Both unusable
  const none = expectedServer3Retail({
    price: "2719",
    wholesaleCost: "2266",
    targetMarkupPercent: 50,
  });
  assert.equal(none.source, "none");

  console.log("server3-margin-audit.test.ts: ok");
}

main();
