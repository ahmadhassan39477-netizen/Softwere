/**
 * Quick parser check — no network, no tokens.
 * Run: node scripts/sms-man-price-parse.test.mjs
 */
import assert from "node:assert/strict";

function isPriceCell(v) {
  return Boolean(v && typeof v === "object" && ("cost" in v || "count" in v));
}
function isApplicationPriceMap(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const vals = Object.values(obj);
  if (vals.length === 0) return false;
  if ("error_code" in obj || "success" in obj) return false;
  return vals.every(isPriceCell);
}
function extractAppPriceMap(json, countryId) {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const tree = json;
  if (tree.success === false || tree.error_code) return null;
  const direct = tree[String(countryId)];
  if (isApplicationPriceMap(direct)) return direct;
  if (isApplicationPriceMap(tree)) return tree;
  for (const [k, v] of Object.entries(tree)) {
    if (String(k) === String(countryId) && isApplicationPriceMap(v)) return v;
  }
  return null;
}

// Nested by country (docs shape)
const nested = {
  "0": { "1": { cost: "15", count: 10 } },
  "12": { "3": { cost: "0.9", count: 50 }, "7": { cost: "1.2", count: 0 } },
};
const m1 = extractAppPriceMap(nested, "12");
assert.equal(m1["3"].cost, "0.9");
assert.equal(Object.keys(m1).length, 2);

// Flat when country filtered
const flat = { "3": { cost: "0.9", count: 50 } };
assert.equal(extractAppPriceMap(flat, "12")["3"].cost, "0.9");

// Error payload must not be treated as prices
assert.equal(
  extractAppPriceMap({ success: false, error_code: "wrong_token" }, "12"),
  null,
);

// Wrong fallback: full tree without matching country must NOT treat countries as apps
assert.equal(extractAppPriceMap({ "0": { "1": { cost: "1", count: 1 } } }, "12"), null);

console.log("sms-man-price-parse ok");
