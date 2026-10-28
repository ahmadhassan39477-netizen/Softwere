/**
 * Unit tests for undercharge expected-retail helpers (no DB).
 * Run: npx tsx scripts/wallet-audit-undercharge.test.ts
 */
import assert from "node:assert/strict";
import { expectedRetailForOrder } from "../src/lib/wallet-audit-undercharge";

function main() {
  const ok = expectedRetailForOrder({ price: "0.0864", wholesaleCost: "0.0720" });
  assert.equal(ok.source, "order.price");
  assert.equal(ok.expected.toFixed(4), "0.0864");

  // Stored price far below fair wholesale×1.20 → use fair
  const low = expectedRetailForOrder({ price: "0.0100", wholesaleCost: "0.1000" });
  assert.equal(low.source, "wholesale*markup");
  assert.equal(low.expected.toFixed(4), "0.1200");

  // Provider-id-as-wholesale absurd → ignore wholesale, keep plausible order.price
  const idAsPrice = expectedRetailForOrder({ price: "0.0864", wholesaleCost: "2266" });
  assert.equal(idAsPrice.source, "order.price");
  assert.equal(idAsPrice.expected.toFixed(4), "0.0864");

  // Both absurd → no anchor
  const none = expectedRetailForOrder({ price: "2719", wholesaleCost: "2266" });
  assert.equal(none.source, "none");
  assert.equal(none.expected.toFixed(4), "0.0000");

  // Zero price + plausible wholesale → fair markup
  const freeish = expectedRetailForOrder({ price: "0", wholesaleCost: "0.05" });
  assert.equal(freeish.source, "wholesale*markup");
  assert.equal(freeish.expected.toFixed(4), "0.0600");

  console.log("wallet-audit-undercharge.test.ts: ok");
}

main();
