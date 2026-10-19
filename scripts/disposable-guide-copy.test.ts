import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PAGE_META, metaLengthIssues } from "../src/lib/seo-meta";
import {
  DISPOSABLE_GUIDE_KEYWORDS,
  DISPOSABLE_GUIDE_PATH,
  DISPOSABLE_GUIDE_URL,
  disposableGuidePlainText,
} from "../src/lib/disposable-guide";

const { title, description } = PAGE_META.disposableGuide;
assert.equal(title.length >= 50 && title.length <= 60, true, `title ${title.length}: ${title}`);
assert.equal(
  description.length >= 140 && description.length <= 160,
  true,
  `description ${description.length}: ${description}`,
);
assert.equal(metaLengthIssues({ disposableGuide: PAGE_META.disposableGuide }).length, 0);

const hay = disposableGuidePlainText().toLowerCase();
for (const phrase of DISPOSABLE_GUIDE_KEYWORDS) {
  assert.ok(hay.includes(phrase.toLowerCase()), `missing keyword: ${phrase}`);
}

const forbidden = [
  "bypass",
  "crypto",
  "webhook",
  "5sim",
  "5-sim",
  "grizzly",
  "sms-man",
  "smsman",
  "areesha",
  "0307",
  "0315",
  "non-voip",
  "non voip",
  "100%",
  "100 percent",
  "bomb",
  "immune",
  "immunity",
  "no registration",
  "no password",
  "no paper trail",
  "wholesale",
];
for (const needle of forbidden) {
  assert.equal(hay.includes(needle), false, `leaked forbidden copy: ${needle}`);
}

assert.equal(DISPOSABLE_GUIDE_PATH, "/guides/disposable-phone-number");
assert.equal(DISPOSABLE_GUIDE_URL, "https://www.tempempire.store/guides/disposable-phone-number");
assert.equal(hay.includes("www.tempempire.store"), true);
assert.equal(hay.includes("temp empire"), true);
assert.equal(hay.includes("20 minute"), true);
assert.equal(hay.includes("auto-refund") || hay.includes("auto refund"), true);
assert.equal(hay.includes("224"), true);
assert.equal(hay.includes("whatsapp deposit") || hay.includes("whatsapp"), true);
assert.equal(hay.includes("non-bank"), true);
assert.equal(hay.includes("sign up") || hay.includes("sign in"), true);

const sitemapSrc = readFileSync(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
assert.ok(sitemapSrc.includes("DISPOSABLE_GUIDE_URL"), "sitemap missing disposable guide URL");
const footerSrc = readFileSync(new URL("../src/components/site-footer.tsx", import.meta.url), "utf8");
assert.ok(footerSrc.includes(DISPOSABLE_GUIDE_PATH), "footer missing guide path");
const homeSrc = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
assert.ok(homeSrc.includes(DISPOSABLE_GUIDE_PATH), "homepage missing guide path");
const mailSrc = readFileSync(new URL("../src/app/mail/page.tsx", import.meta.url), "utf8");
assert.ok(mailSrc.includes(DISPOSABLE_GUIDE_PATH), "mail hub missing guide path");
const ctaSrc = readFileSync(new URL("../src/components/guide-shop-ctas.tsx", import.meta.url), "utf8");
assert.ok(ctaSrc.includes("REGISTER_SERVICES"), "guest Services CTA missing");
assert.ok(ctaSrc.includes("REGISTER_MAIL"), "guest Temp Mail CTA missing");
assert.ok(ctaSrc.includes("REGISTER_USA"), "guest US CTA missing");
assert.ok(ctaSrc.includes("REGISTER_UK"), "guest UK CTA missing");
assert.ok(ctaSrc.includes('service === "disposable"'), "disposable CTA variant missing");

const pageSrc = readFileSync(
  new URL("../src/app/guides/disposable-phone-number/page.tsx", import.meta.url),
  "utf8",
);
assert.ok(pageSrc.includes("<h1"), "guide missing H1");
assert.ok(pageSrc.includes("<h2"), "guide missing H2");
assert.ok(pageSrc.includes("<h3"), "guide missing H3");
assert.ok(pageSrc.includes('service="disposable"'), "guide CTAs not disposable variant");

console.log(
  `OK: Disposable guide t=${title.length} d=${description.length} keywords=${DISPOSABLE_GUIDE_KEYWORDS.length}`,
);
