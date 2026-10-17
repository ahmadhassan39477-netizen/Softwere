/**
 * Prove the live ProxyCheap order/price path returns real wholesale numbers.
 * No Admin key is used or logged.
 */
import { parseQuotedPrice } from "../src/lib/providers/proxy-cheap";

async function main() {
  const body = {
    networkType: "DATACENTER",
    country: "US",
    ipVersion: "IPv4",
    proxyProtocol: "HTTP",
    authenticationType: "USERNAME_PASSWORD",
    quantity: 1,
  };

  const res = await fetch("https://api.proxy-cheap.com/order/price", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  const wholesale = parseQuotedPrice(json);
  if (!res.ok || wholesale == null || wholesale <= 0) {
    console.error("FAIL live price", res.status, wholesale);
    process.exit(1);
  }
  console.log(`OK: live ProxyCheap US datacenter wholesale $${wholesale}`);
}

main();
