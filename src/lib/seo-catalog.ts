/** Programmatic SEO catalog for /buy/[country]/[service] pages. */

export type SeoCountry = {
  slug: string;
  code: string;
  name: string;
  adjective: string;
  flag: string;
};

export type SeoService = {
  slug: string;
  name: string;
  short: string;
};

export const SEO_COUNTRIES: SeoCountry[] = [
  { slug: "usa", code: "US", name: "United States", adjective: "USA", flag: "🇺🇸" },
  { slug: "uk", code: "GB", name: "United Kingdom", adjective: "UK", flag: "🇬🇧" },
  { slug: "nigeria", code: "NG", name: "Nigeria", adjective: "Nigeria", flag: "🇳🇬" },
  { slug: "india", code: "IN", name: "India", adjective: "India", flag: "🇮🇳" },
  { slug: "germany", code: "DE", name: "Germany", adjective: "Germany", flag: "🇩🇪" },
  { slug: "france", code: "FR", name: "France", adjective: "France", flag: "🇫🇷" },
  { slug: "brazil", code: "BR", name: "Brazil", adjective: "Brazil", flag: "🇧🇷" },
  { slug: "indonesia", code: "ID", name: "Indonesia", adjective: "Indonesia", flag: "🇮🇩" },
  { slug: "philippines", code: "PH", name: "Philippines", adjective: "Philippines", flag: "🇵🇭" },
  { slug: "russia", code: "RU", name: "Russia", adjective: "Russia", flag: "🇷🇺" },
];

export const SEO_SERVICES: SeoService[] = [
  { slug: "whatsapp", name: "WhatsApp", short: "WhatsApp OTP" },
  { slug: "telegram", name: "Telegram", short: "Telegram OTP" },
  { slug: "google", name: "Google", short: "Google / Gmail OTP" },
  { slug: "instagram", name: "Instagram", short: "Instagram OTP" },
  { slug: "tiktok", name: "TikTok", short: "TikTok OTP" },
  { slug: "discord", name: "Discord", short: "Discord OTP" },
  { slug: "facebook", name: "Facebook", short: "Facebook OTP" },
  { slug: "twitter", name: "Twitter / X", short: "X (Twitter) OTP" },
  { slug: "binance", name: "Binance", short: "Binance SMS" },
  { slug: "openai", name: "OpenAI", short: "ChatGPT OTP" },
];

export function findSeoCountry(slug: string) {
  return SEO_COUNTRIES.find((c) => c.slug === slug);
}

export function findSeoService(slug: string) {
  return SEO_SERVICES.find((s) => s.slug === slug);
}

export function seoPageTitle(country: SeoCountry, service: SeoService) {
  return `How to Get a ${country.adjective} Temporary Number for ${service.name}`;
}

export function seoH1(country: SeoCountry, service: SeoService) {
  return `Buy a ${country.adjective} virtual number for ${service.name} OTP`;
}

/** ~600-word consumer template — privacy / disposable / virtual SMS / crypto. */
export function seoArticleBody(country: SeoCountry, service: SeoService) {
  const c = country.adjective;
  const s = service.name;
  return [
    `Looking for a private way to receive a ${s} verification code without sharing your personal phone? Temp Empire sells disposable ${c} virtual numbers for SMS OTP — so you can protect your privacy, keep your real line off signup forms, and get codes in seconds.`,
    `A temporary phone number (also called a virtual SMS number or disposable number) is a short-lived line rented only for receiving text messages. When ${s} asks you to confirm a phone number, you paste the Temp Empire number, wait for the one-time password in our live inbox, and finish signup. You are not buying a permanent SIM or carrier plan — just a verification route with an OTP window and automatic refunds if SMS never arrives.`,
    `Why people choose a ${c} number for ${s}: local routing often improves delivery for region-locked flows, and keeping work, travel, or secondary accounts separate from your main device reduces spam and account recovery risk. Temp Empire’s catalog covers ${country.name} alongside other countries, with clear pricing from our wallet balance.`,
    `How it works in three steps. First, create an account and fund your wallet with crypto. Second, open Services (or this page’s Get number button), select ${country.name} and ${s}, pick a server pool, and buy. Third, copy the phone number into ${s}, then watch the live OTP panel — codes auto-appear and can be copied with one tap. Unused numbers that never receive SMS are refunded to your balance.`,
    `Privacy-first stance. We market disposable numbers and virtual SMS OTP for legitimate account verification and privacy hygiene — not for evading platform security, abuse, or banned-account schemes. Always follow ${s}’s terms of service. If you only need a code for a personal or business signup and prefer not to publish your real mobile, a temporary number is the right tool.`,
    `Payments stay simple: crypto deposits credit your wallet; each successful number purchase deducts only after the provider issues a line. Failed provider attempts do not keep your money. Support is available from the footer if deposits, OTP delivery, or account access need a human.`,
    `Ready to start? Buy a ${c} virtual number for ${s} OTP on Temp Empire, complete verification in minutes, and keep your personal phone private.`,
  ].join("\n\n");
}

export const TOP_LONG_TAIL_KEYWORDS = [
  "buy USA virtual number for WhatsApp OTP",
  "temporary UK phone number for Telegram verification",
  "disposable India number for Google SMS OTP",
  "Nigeria virtual SMS number crypto payment",
  "rent Germany temporary number Instagram OTP",
  "France disposable phone number Discord verification",
  "Brazil virtual number TikTok SMS code",
  "Philippines temporary number Gmail verification",
  "buy temporary number with crypto for WhatsApp",
  "privacy virtual SMS OTP number United States",
] as const;

export function allSeoParams() {
  const out: { country: string; service: string }[] = [];
  for (const c of SEO_COUNTRIES) {
    for (const s of SEO_SERVICES) {
      out.push({ country: c.slug, service: s.slug });
    }
  }
  return out;
}
