import { maskSecret, normalizeBaseUrl, normalizeProviderLabel } from "../src/lib/vpn-proxy";

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
assert("label default", normalizeProviderLabel("  ") === "VPN & Proxy");
assert("https ok", normalizeBaseUrl("https://example.com/api/") === "https://example.com/api");
assert("bad url", normalizeBaseUrl("not-a-url") === null);

if (failed) process.exit(1);
console.log("OK: vpn-proxy helpers");
