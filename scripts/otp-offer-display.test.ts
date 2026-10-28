import assert from "node:assert/strict";
import {
  displayNetworkLabel,
  isRawProviderLabel,
  offerRankHint,
  stockBadgeLabel,
  wholesaleNetworkLabel,
} from "../src/lib/sms/offer-display";

assert.equal(isRawProviderLabel("Provider 143"), true);
assert.equal(isRawProviderLabel("Providers 438+64"), true);
assert.equal(isRawProviderLabel("Network"), true);
assert.equal(isRawProviderLabel("438,64"), true);
assert.equal(isRawProviderLabel("T-Mobile"), false);
assert.equal(isRawProviderLabel("NetA"), false);

assert.equal(stockBadgeLabel(true, 156662, "card"), "In stock");
assert.equal(stockBadgeLabel(true, 20), "Limited");
assert.equal(stockBadgeLabel(true, 200), "Available");
assert.equal(stockBadgeLabel(false, 0), "Sold out");
assert.equal(stockBadgeLabel(false, 50, "card"), "Sold out");

assert.equal(displayNetworkLabel("Provider 143", 0, true), "Primary network");
assert.equal(displayNetworkLabel("Provider 11", 1, true), "Network 2");
assert.equal(displayNetworkLabel("Network", 0, false), "Any network");
assert.equal(displayNetworkLabel("T-Mobile", 0, true), "T-Mobile");
assert.equal(displayNetworkLabel("NetA", 2, true), "NetA");

assert.equal(offerRankHint(0, true), "Top ranked");
assert.equal(offerRankHint(1, true), null);
assert.equal(offerRankHint(0, false), null);

assert.equal(wholesaleNetworkLabel("provider0", "438"), "Network");
assert.equal(wholesaleNetworkLabel(null, "143"), "Network");
assert.equal(wholesaleNetworkLabel("NetA", "12"), "NetA");
assert.equal(wholesaleNetworkLabel("T-Mobile", null), "T-Mobile");

console.log("otp-offer-display.test.ts: ok");
