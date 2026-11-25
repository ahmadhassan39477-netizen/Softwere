/**
 * Ensure Admin slot margins are not forced back to 20%.
 * Run: npx tsx scripts/slot-markup-persist.test.ts
 */
import assert from "node:assert/strict";
import {
  DEFAULT_SLOT_MARKUP,
  coerceMarkupPercent,
  retailFromWholesale,
} from "../src/lib/sms/provider-slots";

function main() {
  assert.equal(DEFAULT_SLOT_MARKUP, 20);

  // Server 3 at 50% must produce ×1.50 retail
  assert.equal(retailFromWholesale(0.08, 50), 0.12);
  assert.equal(retailFromWholesale(0.08, 30), 0.104);
  assert.equal(retailFromWholesale(0.08, 20), 0.096);

  // 40% (legacy Grizzly / Gmail-like) must NOT be coerced away
  assert.equal(coerceMarkupPercent(40), 40);
  assert.equal(retailFromWholesale(1, 40), 1.4);

  // Gmail stays on its own 40% constant path — OTP slots stay independent
  assert.equal(coerceMarkupPercent(50), 50);
  assert.equal(coerceMarkupPercent(30), 30);

  console.log("slot-markup-persist.test.ts: ok");
}

main();
