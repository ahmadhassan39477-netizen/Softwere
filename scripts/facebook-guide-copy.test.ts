import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PAGE_META, metaLengthIssues } from "../src/lib/seo-meta";
import {
  FACEBOOK_GUIDE_KEYWORDS,
  FACEBOOK_GUIDE_PATH,
  FACEBOOK_GUIDE_URL,
  facebookGuidePlainText,
} from "../src/lib/facebook-guide";

const { title, description } = PAGE_META.facebookGuide;
assert.equal(title.length >= 50 && title.length <= 60, true, `title ${title.length}: ${title}`);
assert.equal(
  description.length >= 140 && description.length <= 160,
  true,
  `description ${description.length}: ${description}`,
);
assert.equal(metaLengthIssues({ facebookGuide: PAGE_META.facebookGuide }).length, 0);

const hay = facebookGuidePlainText().toLowerCase();
for (const phrase of FACEBOOK_GUIDE_KEYWORDS) {
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
  "100%",
  "100 percent",
  "at&t",
  "t-mobile",
  "vodafone",
  "wholesale",
  "server 2",
  "priority",
];
for (const needle of forbidden) {
  assert.equal(hay.includes(needle), false, `leaked forbidden copy: ${needle}`);
}

assert.equal(FACEBOOK_GUIDE_PATH, "/guides/facebook-temporary-number");
assert.equal(FACEBOOK_GUIDE_URL, "https://www.tempempire.store/guides/facebook-temporary-number");
assert.equal(hay.includes("www.tempempire.store"), true);
assert.equal(hay.includes("temp empire"), true);
assert.equal(hay.includes("20 minute"), true);
assert.equal(hay.includes("auto-refund") || hay.includes("auto refund"), true);
assert.equal(hay.includes("primary"), true);
assert.equal(hay.includes("backup"), true);
assert.equal(hay.includes("extra"), true);
assert.equal(hay.includes("pakistan"), true);
assert.equal(hay.includes("vpn"), true);

const sitemapSrc = readFileSync(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
assert.ok(sitemapSrc.includes("FACEBOOK_GUIDE_URL"), "sitemap missing Facebook guide URL");
const footerSrc = readFileSync(new URL("../src/components/site-footer.tsx", import.meta.url), "utf8");
assert.ok(footerSrc.includes(FACEBOOK_GUIDE_PATH), "footer missing guide path");
const homeSrc = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
assert.ok(homeSrc.includes(FACEBOOK_GUIDE_PATH), "homepage missing guide path");
const ctaSrc = readFileSync(new URL("../src/components/guide-shop-ctas.tsx", import.meta.url), "utf8");
assert.ok(ctaSrc.includes("REGISTER_FACEBOOK"), "guest Buy CTA missing");
assert.ok(ctaSrc.includes("REGISTER_SERVICES"), "guest Services CTA missing");
assert.ok(ctaSrc.includes("REGISTER_VPN"), "guest VPN CTA missing");
assert.ok(ctaSrc.includes('service === "facebook"'), "Facebook CTA variant missing");

const pageSrc = readFileSync(
  new URL("../src/app/guides/facebook-temporary-number/page.tsx", import.meta.url),
  "utf8",
);
assert.ok(pageSrc.includes("<h1"), "guide missing H1");
assert.ok(pageSrc.includes("<h2"), "guide missing H2");
assert.ok(pageSrc.includes("<h3"), "guide missing H3");
assert.ok(pageSrc.includes("service=\"facebook\""), "guide CTAs not Facebook variant");

console.log(
  `OK: Facebook guide t=${title.length} d=${description.length} keywords=${FACEBOOK_GUIDE_KEYWORDS.length}`,
);
