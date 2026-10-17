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
  title: {
    default: "Temp Empire — Buy UK & USA Temporary Numbers for SMS OTP",
    template: "%s · Temp Empire",
  },
  description:
    "Buy UK (+44) and USA (+1) temporary phone numbers to receive SMS OTP online. Private virtual numbers for WhatsApp, Telegram, Google and more — WhatsApp wallet deposit, no SIM card.",
  applicationName: "Temp Empire",
  keywords: [
    "buy UK virtual number",
    "temporary USA phone number",
    "UK number for WhatsApp verification",
    "receive SMS online USA",
    "temporary phone number SMS OTP",
    "disposable virtual number",
    "Temp Empire",
  ],
  alternates: { canonical: BASE },
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
    title: "Temp Empire — UK & USA Temporary Numbers for SMS OTP",
    description:
      "Private +44 and +1 virtual numbers for WhatsApp, Telegram, Google OTP. Receive SMS online — deposit via WhatsApp.",
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
    title: "Temp Empire — UK & USA Temporary Numbers for SMS OTP",
    description:
      "Buy UK and USA virtual numbers to receive SMS OTP online. Private inbox — WhatsApp deposit.",
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
      <body className={`${display.variable} ${mono.variable} antialiased`}>
        <SiteJsonLd />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
