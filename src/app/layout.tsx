import type { Metadata } from "next";
import { Outfit, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteJsonLd } from "@/components/site-json-ld";
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
  title: "Temp Empire — Temporary OTP & Email Marketplace",
  description:
    "Self-service marketplace for temporary phone numbers, SMS OTP verification, and temp email — powered by account credits.",
  applicationName: "Temp Empire",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: BASE,
    siteName: "Temp Empire",
    title: "Temp Empire — Temporary OTP & Email Marketplace",
    description:
      "Buy temporary numbers for SMS OTP and temp email. Credits wallet — WhatsApp deposit.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Temp Empire",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Temp Empire — Temporary OTP & Email Marketplace",
    description:
      "Buy temporary numbers for SMS OTP and temp email. Credits wallet — WhatsApp deposit.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${display.variable} ${mono.variable} antialiased`}>
        <SiteJsonLd />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
