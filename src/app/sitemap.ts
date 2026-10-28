import type { MetadataRoute } from "next";
import {
  PRIORITY_SEO_COUNTRIES,
  SEO_COUNTRIES,
  SEO_SERVICES,
} from "@/lib/seo-catalog";
import { DISPOSABLE_GUIDE_URL } from "@/lib/disposable-guide";
import { FACEBOOK_GUIDE_URL } from "@/lib/facebook-guide";
import { GUIDES_HUB_URL } from "@/lib/guides-catalog";
import { RESELLER_API_GUIDE_URL } from "@/lib/reseller-api-guide";
import { WHATSAPP_GUIDE_URL } from "@/lib/whatsapp-guide";

const BASE = "https://www.tempempire.store";

/** Sitemap is UK/USA/Canada only — long-tail /buy grids stay live but off-sitemap to cut GSC discover-noise. */
const SITEMAP_COUNTRIES = SEO_COUNTRIES.filter((c) =>
  (PRIORITY_SEO_COUNTRIES as readonly string[]).includes(c.slug),
);

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const hubs = SITEMAP_COUNTRIES.map((c) => ({
    url: `${BASE}/buy/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: c.slug === "canada" ? 0.8 : 0.95,
  }));

  const buy = SITEMAP_COUNTRIES.flatMap((c) =>
    SEO_SERVICES.map((service) => {
      const money =
        service.slug === "whatsapp" ||
        service.slug === "facebook" ||
        service.slug === "telegram" ||
        service.slug === "google";
      return {
        url: `${BASE}/buy/${c.slug}/${service.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: money ? 0.9 : 0.75,
      };
    }),
  );

  return [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Bare /login skipped — skip SEO; gated /services already omitted
    { url: `${BASE}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
    { url: `${BASE}/mail`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    {
      url: GUIDES_HUB_URL,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.95,
    },
    {
      url: WHATSAPP_GUIDE_URL,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.92,
    },
    {
      url: FACEBOOK_GUIDE_URL,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: DISPOSABLE_GUIDE_URL,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: RESELLER_API_GUIDE_URL,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...hubs,
    ...buy,
  ];
}
