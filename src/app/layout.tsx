import type { Metadata } from "next";
import { Outfit, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteJsonLd } from "@/components/site-json-ld";
import { HOME_KEYWORDS, PAGE_META } from "@/lib/seo-meta";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

/** Canonical production origin for OG / icons (Google crawl). */
const BASE = "https://www.tempempire.store";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: PAGE_META.home.title,
    template: "%s · Temp Empire",
  },
  description: PAGE_META.home.description,
  applicationName: "Temp Empire",
  keywords: [...HOME_KEYWORDS, "Temp Empire"],
  alternates: { canonical: BASE },
  icons: {
    // Google Search favicon must be a multiple of 48px. Do not advertise 16x16.
    icon: [
      { url: `${BASE}/icon-48.png`, sizes: "48x48", type: "image/png" },
      { url: `${BASE}/icon-96.png`, sizes: "96x96", type: "image/png" },
      { url: `${BASE}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${BASE}/icon-512.png`, sizes: "512x512", type: "image/png" },
      { url: `${BASE}/favicon.ico`, sizes: "48x48", type: "image/x-icon" },
    ],
    apple: [{ url: `${BASE}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: BASE,
    siteName: "Temp Empire",
    title: PAGE_META.home.title,
    description: PAGE_META.home.description,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Temp Empire — temporary UK and USA numbers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META.home.title,
    description: PAGE_META.home.description,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href={`${BASE}/icon-48.png`} sizes="48x48" type="image/png" />
        <link rel="icon" href={`${BASE}/icon-192.png`} sizes="192x192" type="image/png" />
        <link rel="apple-touch-icon" href={`${BASE}/apple-touch-icon.png`} sizes="180x180" />
      </head>
      <body className={`${display.variable} ${mono.variable} antialiased`}>
        <SiteJsonLd />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
