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
assert("display default", normalizeDisplayName("") === "VPN & Proxy");
assert("https ok", normalizeBaseUrl("https://example.com/api/") === "https://example.com/api");
assert("bad url", normalizeBaseUrl("not-a-url") === null);
assert("enabled missing uses fallback", parseEnabled(undefined, true) === true);
assert("markup clamp", parseMarkupPercent("900") === 500);
assert("retail", retailFromWholesale(5, 20) === 6);
assert("sanitize", sanitizeProviderError("leak KEYKEYKEY", ["KEYKEYKEY"]) === "leak [redacted]");

if (failed) process.exit(1);
console.log("OK: vpn-proxy helpers");
