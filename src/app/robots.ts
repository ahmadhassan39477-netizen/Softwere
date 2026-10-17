import type { MetadataRoute } from "next";

/** Always publish canonical production host for Google (ignore local AUTH_URL). */
const BASE = "https://www.tempempire.store";

/**
 * Allow Google to crawl brand icons / OG assets for Search favicon + share preview.
 * Do not disallow icons, OG assets, or Google Search Console /google*.html verify files.
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
          "/gsc-file-public-check.html",
        ],
        // No Disallow of icon or preview assets
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: "www.tempempire.store",
  };
}
