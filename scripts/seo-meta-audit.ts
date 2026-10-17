import { SEO_COUNTRIES, SEO_SERVICES, seoPageDescription, seoPageTitle } from "../src/lib/seo-catalog";
import { PAGE_META, metaLengthIssues } from "../src/lib/seo-meta";

const issues = [...metaLengthIssues()];

for (const [key, { title, description }] of Object.entries(PAGE_META)) {
  console.log(`${key.padEnd(10)} t=${title.length} d=${description.length}`);
}

const priority = new Set(["usa", "uk", "canada"]);
const watch = new Set(["facebook", "whatsapp"]);

for (const country of SEO_COUNTRIES) {
  for (const service of SEO_SERVICES) {
    const title = seoPageTitle(country, service);
    const description = seoPageDescription(country, service);
    const important = priority.has(country.slug) && watch.has(service.slug);
    if (important && (title.length < 50 || title.length > 60)) {
      issues.push(`${country.slug}/${service.slug} title ${title.length}: ${title}`);
    }
    if (important && (description.length < 140 || description.length > 160)) {
      issues.push(`${country.slug}/${service.slug} desc ${description.length}: ${description}`);
    }
    if (important) {
      console.log(
        `${country.slug}/${service.slug.padEnd(10)} t=${title.length} d=${description.length}`,
      );
    }
  }
}

if (issues.length) {
  console.error("\nMETA LENGTH ISSUES");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("\nOK: key titles 50–60 and descriptions 140–160");
