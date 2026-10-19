import type { MetadataRoute } from "next";
import {
  PRIORITY_SEO_COUNTRIES,
  SEO_COUNTRIES,
  allSeoParams,
} from "@/lib/seo-catalog";
import { DISPOSABLE_GUIDE_URL } from "@/lib/disposable-guide";
import { FACEBOOK_GUIDE_URL } from "@/lib/facebook-guide";
import { WHATSAPP_GUIDE_URL } from "@/lib/whatsapp-guide";

const BASE = "https://www.tempempire.store";

export default function sitemap(): MetadataRoute.Sitemap {
  const hubs = SEO_COUNTRIES.map((c) => ({
    url: `${BASE}/buy/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: (PRIORITY_SEO_COUNTRIES as readonly string[]).includes(c.slug) ? 0.95 : 0.75,
  }));

  const buy = allSeoParams().map(({ country, service }) => {
    const priority =
      (PRIORITY_SEO_COUNTRIES as readonly string[]).includes(country) &&
      (service === "whatsapp" ||
        service === "facebook" ||
        service === "telegram" ||
        service === "google")
        ? 0.9
        : (PRIORITY_SEO_COUNTRIES as readonly string[]).includes(country)
          ? 0.8
          : 0.65;
    return {
      url: `${BASE}/buy/${country}/${service}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority,
    };
  });

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.55 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/support`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.35 },
    { url: `${BASE}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.55 },
    { url: `${BASE}/services`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: `${BASE}/mail`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    {
      url: WHATSAPP_GUIDE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: FACEBOOK_GUIDE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: DISPOSABLE_GUIDE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...hubs,
    ...buy,
  ];
}
