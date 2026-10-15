import type { MetadataRoute } from "next";

/** Always publish canonical production host for Google (ignore local AUTH_URL). */
const BASE = "https://www.tempempire.store";

/**
 * Allow Google to crawl brand icons / OG assets for Search favicon + share preview.
 * Do not disallow /favicon.ico, /icon-*.png, /og-image.png, /logo.png, /apple-touch-icon.png.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/favicon.ico",
          "/icon-48.png",
          "/icon-96.png",
          "/icon-192.png",
          "/icon-512.png",
          "/apple-touch-icon.png",
          "/og-image.png",
          "/logo.png",
          "/brand/",
        ],
        // No Disallow of icon or preview assets
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: "www.tempempire.store",
  };
}
