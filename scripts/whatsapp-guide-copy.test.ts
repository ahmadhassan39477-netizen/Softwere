import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PAGE_META, metaLengthIssues } from "../src/lib/seo-meta";
import {
  WHATSAPP_GUIDE_KEYWORDS,
  WHATSAPP_GUIDE_PATH,
  WHATSAPP_GUIDE_URL,
  whatsappGuidePlainText,
} from "../src/lib/whatsapp-guide";

const { title, description } = PAGE_META.whatsappGuide;
assert.equal(title.length >= 50 && title.length <= 60, true, `title ${title.length}: ${title}`);
assert.equal(
  description.length >= 140 && description.length <= 160,
  true,
  `description ${description.length}: ${description}`,
);
assert.equal(metaLengthIssues({ whatsappGuide: PAGE_META.whatsappGuide }).length, 0);

const hay = whatsappGuidePlainText().toLowerCase();
for (const phrase of WHATSAPP_GUIDE_KEYWORDS) {
  assert.ok(hay.includes(phrase.toLowerCase()), `missing keyword: ${phrase}`);
}

const forbidden = [
  "bypass",
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
  "never block",
];
for (const needle of forbidden) {
  assert.equal(hay.includes(needle), false, `leaked forbidden copy: ${needle}`);
}

assert.equal(WHATSAPP_GUIDE_PATH, "/guides/whatsapp-temporary-number");
assert.equal(WHATSAPP_GUIDE_URL, "https://www.tempempire.store/guides/whatsapp-temporary-number");
assert.equal(hay.includes("www.tempempire.store"), true);
assert.equal(hay.includes("temp empire"), true);

const sitemapSrc = readFileSync(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
assert.ok(sitemapSrc.includes("WHATSAPP_GUIDE_URL"), "sitemap missing WhatsApp guide URL");
const footerSrc = readFileSync(new URL("../src/components/site-footer.tsx", import.meta.url), "utf8");
assert.ok(footerSrc.includes(WHATSAPP_GUIDE_PATH), "footer missing guide path");
const homeSrc = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
assert.ok(homeSrc.includes(WHATSAPP_GUIDE_PATH), "homepage missing guide path");
const ctaSrc = readFileSync(new URL("../src/components/guide-shop-ctas.tsx", import.meta.url), "utf8");
assert.ok(ctaSrc.includes("REGISTER_WHATSAPP"), "guest Buy CTA missing");
assert.ok(ctaSrc.includes("REGISTER_SERVICES"), "guest Services CTA missing");
assert.ok(ctaSrc.includes("REGISTER_USA"), "guest US CTA missing");
assert.ok(ctaSrc.includes("REGISTER_UK"), "guest UK CTA missing");

console.log(
  `OK: WhatsApp guide t=${title.length} d=${description.length} keywords=${WHATSAPP_GUIDE_KEYWORDS.length}`,
);
