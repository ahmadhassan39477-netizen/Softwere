import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const schemaSrc = readFileSync(new URL("../src/components/site-json-ld.tsx", import.meta.url), "utf8");
assert.equal(schemaSrc.includes('name: "Shabeh Ul Hassan"'), true);
assert.equal(schemaSrc.includes('founder: FOUNDER'), true);
assert.equal(schemaSrc.includes("owner: FOUNDER"), true);
assert.equal(schemaSrc.includes('name: "Temp Empire"'), true);
assert.equal(schemaSrc.includes("https://www.tempempire.store"), true);
assert.ok(schemaSrc.includes('"@type": "Organization"') || schemaSrc.includes('@type: "Organization"'));
assert.ok(schemaSrc.includes('"@type": "WebSite"') || schemaSrc.includes('@type: "WebSite"'));
assert.ok(schemaSrc.includes('"@type": "Person"') || schemaSrc.includes('@type: "Person"'));
assert.equal(/areesha/i.test(schemaSrc), false);

const skip = new Set([join("src", "components", "site-json-ld.tsx")]);

function walk(dir: string, acc: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(p, acc);
    } else if (/\.(tsx|ts|jsx|js)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

const leaks: string[] = [];
for (const file of walk("src").filter((f) => !skip.has(f))) {
  const text = readFileSync(file, "utf8");
  if (/shabeh/i.test(text) || /areesha/i.test(text)) leaks.push(file);
}
assert.deepEqual(leaks, [], `name leaked into UI copy: ${leaks.join(", ")}`);

const visibleMeta = readFileSync(new URL("../src/lib/seo-meta.ts", import.meta.url), "utf8");
assert.equal(/shabeh/i.test(visibleMeta), false);
assert.equal(/areesha/i.test(visibleMeta), false);

console.log("OK: owner JSON-LD only; UI copy clean");
