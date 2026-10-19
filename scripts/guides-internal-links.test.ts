import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PAGE_META, metaLengthIssues } from "../src/lib/seo-meta";
import {
  GUIDES_HUB_PATH,
  GUIDES_HUB_URL,
  PUBLIC_GUIDES,
  otherPublicGuides,
} from "../src/lib/guides-catalog";

assert.equal(PUBLIC_GUIDES.length, 4);
assert.equal(GUIDES_HUB_PATH, "/guides");
assert.equal(GUIDES_HUB_URL, "https://www.tempempire.store/guides");
assert.equal(metaLengthIssues({ guidesHub: PAGE_META.guidesHub }).length, 0);

const { title, description } = PAGE_META.guidesHub;
assert.equal(title.length >= 50 && title.length <= 60, true, `title ${title.length}`);
assert.equal(
  description.length >= 140 && description.length <= 160,
  true,
  `description ${description.length}`,
);

const hubSrc = readFileSync(new URL("../src/app/guides/page.tsx", import.meta.url), "utf8");
assert.ok(hubSrc.includes("<h1"), "hub missing H1");
assert.ok(hubSrc.includes("<h2"), "hub missing H2");
assert.ok(hubSrc.includes("PUBLIC_GUIDES"), "hub must list PUBLIC_GUIDES");
for (const g of PUBLIC_GUIDES) {
  assert.ok(g.path.startsWith("/guides/"), `${g.id} path`);
}

const sitemapSrc = readFileSync(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
assert.ok(sitemapSrc.includes("GUIDES_HUB_URL"), "sitemap missing hub");
assert.ok(sitemapSrc.includes("WHATSAPP_GUIDE_URL"));
assert.ok(sitemapSrc.includes("FACEBOOK_GUIDE_URL"));
assert.ok(sitemapSrc.includes("DISPOSABLE_GUIDE_URL"));
assert.ok(sitemapSrc.includes("RESELLER_API_GUIDE_URL"));

const footerSrc = readFileSync(new URL("../src/components/site-footer.tsx", import.meta.url), "utf8");
assert.ok(footerSrc.includes('href: "/guides"'), "footer missing hub");
for (const g of PUBLIC_GUIDES) {
  assert.ok(footerSrc.includes(g.path), `footer missing ${g.path}`);
}

const homeSrc = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
assert.ok(homeSrc.includes('href="/guides"'), "homepage missing hub");
for (const g of PUBLIC_GUIDES) {
  assert.ok(homeSrc.includes(g.path), `homepage missing ${g.path}`);
}
const heroChips = homeSrc.match(/label: "US temp num"[\s\S]*?\]\.map\(\(b\)/)?.[0] ?? "";
assert.ok(heroChips.includes("Temp Mail Plus") && heroChips.includes("VPN & Proxy"), "hero chips missing basics");
assert.equal(/All guides|WhatsApp guide|Facebook guide|Disposable guide|Reseller API/.test(heroChips), false, "hero chip row still has guide chips");

const pages: Record<string, string> = {
  whatsapp: readFileSync(
    new URL("../src/app/guides/whatsapp-temporary-number/page.tsx", import.meta.url),
    "utf8",
  ),
  facebook: readFileSync(
    new URL("../src/app/guides/facebook-temporary-number/page.tsx", import.meta.url),
    "utf8",
  ),
  disposable: readFileSync(
    new URL("../src/app/guides/disposable-phone-number/page.tsx", import.meta.url),
    "utf8",
  ),
  "reseller-api": readFileSync(
    new URL("../src/app/guides/reseller-api/page.tsx", import.meta.url),
    "utf8",
  ),
};

const keepReading = readFileSync(
  new URL("../src/components/guide-keep-reading.tsx", import.meta.url),
  "utf8",
);
assert.ok(keepReading.includes("otherPublicGuides"), "keep-reading must emit the other three");
assert.ok(keepReading.includes("GUIDES_HUB_PATH"), "keep-reading must link the hub");

for (const g of PUBLIC_GUIDES) {
  const src = pages[g.id];
  assert.ok(src.includes("GuideBreadcrumb"), `${g.id} missing breadcrumb`);
  assert.ok(src.includes(`currentId="${g.id}"`) || src.includes(`"${g.id}"`), `${g.id} keep-reading id`);
  assert.ok(src.includes("GuideKeepReading"), `${g.id} missing keep-reading`);
  for (const other of otherPublicGuides(g.id)) {
    assert.equal(
      otherPublicGuides(g.id).some((o) => o.path === other.path),
      true,
    );
  }
}

const buyHub = readFileSync(new URL("../src/app/buy/[country]/page.tsx", import.meta.url), "utf8");
assert.ok(buyHub.includes("/guides/whatsapp-temporary-number"), "country hub missing WhatsApp guide");
assert.ok(buyHub.includes("/guides/facebook-temporary-number"), "country hub missing Facebook guide");
assert.ok(buyHub.includes('href="/guides"'), "country hub missing guides hub");

const buyService = readFileSync(
  new URL("../src/app/buy/[country]/[service]/page.tsx", import.meta.url),
  "utf8",
);
assert.ok(buyService.includes("/guides/whatsapp-temporary-number"), "WhatsApp buy missing guide");
assert.ok(buyService.includes("/guides/facebook-temporary-number"), "Facebook buy missing guide");
assert.ok(buyService.includes('href="/guides"'), "service buy missing guides hub");

const mw = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");
assert.ok(!mw.includes('"/guides"'), "guides hub must stay public");

console.log(`OK: guides internal links hub t=${title.length} d=${description.length}`);
