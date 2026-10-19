import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PAGE_META, metaLengthIssues } from "../src/lib/seo-meta";
import {
  RESELLER_API_GUIDE_KEYWORDS,
  RESELLER_API_GUIDE_PATH,
  RESELLER_API_GUIDE_URL,
  resellerApiGuidePlainText,
} from "../src/lib/reseller-api-guide";

const { title, description } = PAGE_META.resellerApiGuide;
assert.equal(title.length >= 50 && title.length <= 60, true, `title ${title.length}: ${title}`);
assert.equal(
  description.length >= 140 && description.length <= 160,
  true,
  `description ${description.length}: ${description}`,
);
assert.equal(metaLengthIssues({ resellerApiGuide: PAGE_META.resellerApiGuide }).length, 0);

const hay = resellerApiGuidePlainText().toLowerCase();
for (const phrase of RESELLER_API_GUIDE_KEYWORDS) {
  assert.ok(hay.includes(phrase.toLowerCase()), `missing keyword: ${phrase}`);
}

const forbidden = [
  "bypass",
  "5sim",
  "5-sim",
  "sms-activate",
  "smsactivate",
  "grizzly",
  "sms-man",
  "smsman",
  "areesha",
  "0307",
  "0315",
  "wholesale",
  "bot farm",
  "multi-account",
  "multi account",
];
for (const needle of forbidden) {
  assert.equal(hay.includes(needle), false, `leaked forbidden copy: ${needle}`);
}

assert.equal(RESELLER_API_GUIDE_PATH, "/guides/reseller-api");
assert.equal(RESELLER_API_GUIDE_URL, "https://www.tempempire.store/guides/reseller-api");
assert.equal(hay.includes("www.tempempire.store"), true);
assert.equal(hay.includes("temp empire"), true);
assert.equal(hay.includes("20 minute"), true);
assert.equal(hay.includes("auto-refund") || hay.includes("auto refund"), true);
assert.equal(hay.includes("primary"), true);
assert.equal(hay.includes("backup"), true);
assert.equal(hay.includes("extra"), true);
assert.equal(hay.includes("/api/v1/services"), true);
assert.equal(hay.includes("/api/v1/purchase"), true);
assert.equal(hay.includes("/api/v1/otp/"), true);
assert.equal(hay.includes("/api/orders/stream"), true);
assert.equal(hay.includes("no otp webhooks") || hay.includes("there are no otp webhooks"), true);
assert.equal(hay.includes("/api/v1/countries"), true);
assert.equal(hay.includes("/api/v1/cancel/"), true);
assert.equal(hay.includes("/api/v1/balance"), true);
assert.equal(hay.includes("x-api-key"), true);
assert.equal(hay.includes("qa"), true);

const sitemapSrc = readFileSync(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
assert.ok(sitemapSrc.includes("RESELLER_API_GUIDE_URL"), "sitemap missing Reseller API guide URL");
const footerSrc = readFileSync(new URL("../src/components/site-footer.tsx", import.meta.url), "utf8");
assert.ok(footerSrc.includes(RESELLER_API_GUIDE_PATH), "footer missing guide path");
const homeSrc = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
assert.ok(homeSrc.includes(RESELLER_API_GUIDE_PATH), "homepage missing guide path");
const ctaSrc = readFileSync(new URL("../src/components/guide-api-ctas.tsx", import.meta.url), "utf8");
assert.ok(ctaSrc.includes("REGISTER_API"), "guest API docs CTA missing");
assert.ok(ctaSrc.includes("API docs / generate keys"), "primary CTA label missing");
assert.ok(ctaSrc.includes("/api-docs"), "signed-in API docs path missing");

const pageSrc = readFileSync(
  new URL("../src/app/guides/reseller-api/page.tsx", import.meta.url),
  "utf8",
);
assert.ok(pageSrc.includes("<h1"), "guide missing H1");
assert.ok(pageSrc.includes("<h2"), "guide missing H2");
assert.ok(pageSrc.includes("<h3"), "guide missing H3");
assert.ok(pageSrc.includes("GuideApiCtas"), "guide missing API CTAs");
assert.ok(
  readFileSync(new URL("../src/app/guides/disposable-phone-number/page.tsx", import.meta.url), "utf8")
    .includes("DISPOSABLE_GUIDE"),
  "must not overwrite disposable-phone-number guide",
);

const mw = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");
assert.ok(mw.includes('"/api-docs"'), "api-docs must stay gated");
assert.ok(!mw.includes("/guides"), "guides must stay public (not in protected prefixes)");

console.log(
  `OK: Reseller API guide t=${title.length} d=${description.length} keywords=${RESELLER_API_GUIDE_KEYWORDS.length}`,
);
