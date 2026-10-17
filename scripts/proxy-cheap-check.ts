import {
  decodePlanId,
  encodePlanId,
  executeBody,
  parseBalance,
  parseOrderId,
  parseProxies,
  parseQuotedPrice,
  parseServicesPayload,
  prettyNetwork,
} from "../src/lib/providers/proxy-cheap";
import {
  maskSecret,
  normalizeBaseUrl,
  normalizeDisplayName,
  normalizeProviderLabel,
  parseEnabled,
  parseMarkupPercent,
  retailFromWholesale,
  sanitizeProviderError,
} from "../src/lib/vpn-proxy";

let failed = 0;
function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    failed += 1;
  }
}

assert("mask empty", maskSecret("") === "");
assert("mask short", maskSecret("ab") === "••••");
assert("mask long", maskSecret("abcdefgh").startsWith("ab") && maskSecret("abcdefgh").endsWith("gh"));
assert("label default", normalizeProviderLabel("  ") === "Proxy Cheap");
assert("label alias", normalizeProviderLabel("proxycheap") === "Proxy Cheap");
assert("display default", normalizeDisplayName("  ") === "VPN & Proxy");
assert("https ok", normalizeBaseUrl("https://api.proxy-cheap.com/") === "https://api.proxy-cheap.com");
assert("bad url", normalizeBaseUrl("not-a-url") === null);
assert("enabled true", parseEnabled("true") === true);
assert("enabled false", parseEnabled("false") === false);
assert("markup default", parseMarkupPercent("") === 20);
assert("retail 20%", retailFromWholesale(10, 20) === 12);
assert(
  "sanitize strips key",
  !sanitizeProviderError("bad key SECRET1234", ["SECRET1234"]).includes("SECRET1234"),
);
assert("pretty DC", prettyNetwork("DATACENTER") === "Datacenter proxy");

const nested = parseServicesPayload({
  services: [
    {
      id: "dc",
      name: "Datacenter",
      type: "DATACENTER",
      plans: [{ id: "m1", name: "US monthly", price: 2.5, country: "US", period: 1 }],
    },
  ],
});
assert("nested plan count", nested.length === 1);
assert("nested wholesale", nested[0]?.wholesale === 2.5);
assert("nested country", nested[0]?.country === "US");

const decoded = decodePlanId(nested[0]!.id);
assert("roundtrip network", decoded?.networkType === "DATACENTER");
assert("roundtrip package", decoded?.planId === "m1" || decoded?.package === "m1");
assert("encode prefix", nested[0]!.id.startsWith("pc1."));
assert("bad plan", decodePlanId("nope") === null);

const flat = parseServicesPayload([{ networkType: "MOBILE", price: 8, country: "GB" }]);
assert("flat mobile", flat[0]?.networkType === "MOBILE" && flat[0]?.wholesale === 8);

assert("quoted finalPrice", parseQuotedPrice({ finalPrice: 1.77, unit: "month" }) === 1.77);
assert("quoted missing", parseQuotedPrice({ price: null }) === null);
assert("balance object", parseBalance({ balance: 12.34 }) === 12.34);
assert("balance nested", parseBalance({ data: { amount: 9 } }) === 9);
assert("order id", parseOrderId({ id: "ord-1" }) === "ord-1");
assert(
  "proxies conn",
  parseProxies([{ connection: { publicIp: "1.2.3.4", port: 8080, username: "u", password: "p" } }])[0]
    ?.host === "1.2.3.4",
);

const body = executeBody({ networkType: "RESIDENTIAL", country: "US", package: "pkg" });
assert("execute network", body.networkType === "RESIDENTIAL");
assert("execute package", body.package === "pkg");

if (failed) process.exit(1);
console.log("OK: proxy-cheap helpers");
