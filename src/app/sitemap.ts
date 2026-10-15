import type { MetadataRoute } from "next";
import { allSeoParams } from "@/lib/seo-catalog";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.tempempire.store";

export default function sitemap(): MetadataRoute.Sitemap {
  const buy = allSeoParams().map(({ country, service }) => ({
    url: `${BASE}/buy/${country}/${service}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/support`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/services`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    ...buy,
  ];
}
