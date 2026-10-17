/** Programmatic SEO catalog for /buy hubs and /buy/[country]/[service] pages. */

export type SeoCountry = {
  slug: string;
  code: string;
  name: string;
  adjective: string;
  flag: string;
  dial: string;
  /** Primary Google-intent phrases for this market */
  keywords: string[];
};

export type SeoService = {
  slug: string;
  name: string;
  short: string;
};

export type SeoFaq = { q: string; a: string };

export const SEO_COUNTRIES: SeoCountry[] = [
  {
    slug: "usa",
    code: "US",
    name: "United States",
    adjective: "USA",
    flag: "🇺🇸",
    dial: "+1",
    keywords: [
      "buy USA virtual number",
      "temporary USA phone number",
      "receive SMS online USA",
      "USA temp number for WhatsApp",
      "disposable US phone number SMS OTP",
      "American virtual number verification",
    ],
  },
  {
    slug: "uk",
    code: "GB",
    name: "United Kingdom",
    adjective: "UK",
    flag: "🇬🇧",
    dial: "+44",
    keywords: [
      "buy UK virtual number",
      "temporary UK phone number",
      "UK number for WhatsApp verification",
      "receive SMS online UK +44",
      "disposable UK mobile number OTP",
      "British virtual SMS number",
    ],
  },
  {
    slug: "nigeria",
    code: "NG",
    name: "Nigeria",
    adjective: "Nigeria",
    flag: "🇳🇬",
    dial: "+234",
    keywords: ["Nigeria virtual SMS number", "temporary Nigeria phone number OTP"],
  },
  {
    slug: "india",
    code: "IN",
    name: "India",
    adjective: "India",
    flag: "🇮🇳",
    dial: "+91",
    keywords: ["India temporary number SMS", "disposable India number OTP"],
  },
  {
    slug: "germany",
    code: "DE",
    name: "Germany",
    adjective: "Germany",
    flag: "🇩🇪",
    dial: "+49",
    keywords: ["Germany temporary number SMS OTP"],
  },
  {
    slug: "france",
    code: "FR",
    name: "France",
    adjective: "France",
    flag: "🇫🇷",
    dial: "+33",
    keywords: ["France disposable phone number verification"],
  },
  {
    slug: "brazil",
    code: "BR",
    name: "Brazil",
    adjective: "Brazil",
    flag: "🇧🇷",
    dial: "+55",
    keywords: ["Brazil virtual number SMS OTP"],
  },
  {
    slug: "indonesia",
    code: "ID",
    name: "Indonesia",
    adjective: "Indonesia",
    flag: "🇮🇩",
    dial: "+62",
    keywords: ["Indonesia temporary SMS number"],
  },
  {
    slug: "philippines",
    code: "PH",
    name: "Philippines",
    adjective: "Philippines",
    flag: "🇵🇭",
    dial: "+63",
    keywords: ["Philippines temporary number Gmail"],
  },
  {
    slug: "russia",
    code: "RU",
    name: "Russia",
    adjective: "Russia",
    flag: "🇷🇺",
    dial: "+7",
    keywords: ["Russia virtual SMS number"],
  },
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

/** Priority markets for homepage / sitemap weight. */
export const PRIORITY_SEO_COUNTRIES = ["usa", "uk"] as const;

export function findSeoCountry(slug: string) {
  return SEO_COUNTRIES.find((c) => c.slug === slug);
}

export function findSeoService(slug: string) {
  return SEO_SERVICES.find((s) => s.slug === slug);
}

export function seoPageTitle(country: SeoCountry, service: SeoService) {
  if (country.slug === "uk") {
    return `Buy UK ${service.name} Number (${country.dial}) — Temporary SMS OTP`;
  }
  if (country.slug === "usa") {
    return `Buy USA ${service.name} Number (${country.dial}) — Temp SMS Verification`;
  }
  return `Buy ${country.adjective} Temporary Number for ${service.name} OTP`;
}

export function seoPageDescription(country: SeoCountry, service: SeoService) {
  return `Get a private ${country.adjective} (${country.dial}) virtual number for ${service.name} SMS OTP on Temp Empire. Receive verification codes online — no SIM card. Sign up, deposit via WhatsApp, buy in seconds.`;
}

export function seoH1(country: SeoCountry, service: SeoService) {
  if (country.slug === "uk") {
    return `Buy a UK virtual number for ${service.name} OTP (${country.dial})`;
  }
  if (country.slug === "usa") {
    return `Buy a USA temporary number for ${service.name} SMS verification`;
  }
  return `Buy a ${country.adjective} virtual number for ${service.name} OTP`;
}

export function seoHubTitle(country: SeoCountry) {
  if (country.slug === "uk") {
    return `UK Virtual Phone Numbers (+44) for SMS OTP | Temp Empire`;
  }
  if (country.slug === "usa") {
    return `USA Temporary Phone Numbers (+1) for SMS Verification | Temp Empire`;
  }
  return `${country.name} Temporary Numbers for SMS OTP | Temp Empire`;
}

export function seoHubDescription(country: SeoCountry) {
  return `Buy ${country.adjective} (${country.dial}) temporary phone numbers to receive SMS online. Private OTP for WhatsApp, Telegram, Google, Instagram and more — pay from your Temp Empire wallet.`;
}

export function seoHubH1(country: SeoCountry) {
  if (country.slug === "uk") {
    return `UK temporary phone numbers (+44) for SMS verification`;
  }
  if (country.slug === "usa") {
    return `USA temporary phone numbers (+1) to receive SMS online`;
  }
  return `${country.name} temporary numbers for SMS OTP`;
}

/** Long-form hub copy — UK/USA get richer competitor-style content. */
export function seoHubArticle(country: SeoCountry): string {
  const dial = country.dial;
  const c = country.adjective;
  const name = country.name;

  if (country.slug === "uk") {
    return [
      `Looking for a UK virtual number to receive SMS online? Temp Empire sells private +44 temporary phone numbers for SMS OTP — so you can verify WhatsApp, Telegram, Google, Instagram, Discord and other apps without sharing your personal mobile.`,
      `A UK temporary number (also called a disposable UK mobile or British virtual SMS number) is a short-lived line you rent only to receive verification texts. When an app asks for a United Kingdom phone number, you paste the Temp Empire +44 number, wait for the one-time password in our live inbox, and finish signup. You are not buying a physical SIM, UK address, or carrier contract — just a private receive-SMS route with an OTP window.`,
      `Why UK (+44) numbers rank among the most requested routes: many apps treat British mobile ranges as high-trust for verification, and people abroad often need a UK number for region-locked signups, travel accounts, or keeping work profiles separate from their real phone. Competitors pitch “real +44 for WhatsApp” and “receive SMS online UK” — we match that intent with clear pricing, private inbox delivery, and wallet credits.`,
      `How to buy a UK number on Temp Empire in three steps. First, create an account (email and password). Second, open Deposit and message WhatsApp to add wallet credit — balance updates after we confirm payment. Third, open Services, choose United Kingdom and your app (WhatsApp, Telegram, Google, and more), buy a number, paste it into the app, and watch the live OTP panel. If SMS never arrives in the window, eligible orders are refunded to your balance.`,
      `Popular UK OTP use cases: WhatsApp verification with a +44 line, Telegram SMS login, Google / Gmail phone checks, Instagram and TikTok signups, Discord, Facebook, X (Twitter), and exchange or AI tool verifications. Always follow each app’s terms — Temp Empire is for legitimate privacy and secondary-account hygiene, not for abusing platforms.`,
      `Compared with public “free SMS” pages, a paid private UK number keeps your code out of shared inboxes. Compared with monthly rental SIMs, pay-per-OTP fits one-off verifications. Browse the service links below or go straight to Services after you sign up.`,
      `Ready to start? Buy a UK virtual number for SMS OTP on Temp Empire, complete verification in minutes, and keep your personal phone private.`,
    ].join("\n\n");
  }

  if (country.slug === "usa") {
    return [
      `Need a USA temporary phone number to receive SMS online? Temp Empire sells private American (+1) virtual numbers for SMS OTP verification — WhatsApp, Telegram, Google, Instagram, TikTok, Discord and hundreds of other services — without a US SIM card or carrier plan.`,
      `A USA temp number is a short-lived virtual SMS line. When a site or app requires a United States phone number, you purchase a +1 number from Temp Empire, enter it on the signup form, and read the verification code in your live order panel. Pay only when a number is issued; eligible failed deliveries refund to your wallet.`,
      `Why USA (+1) numbers matter for ranking audiences: many platforms default to US verification, marketers and travelers want American numbers for region checks, and search demand clusters around phrases like “buy USA virtual number,” “temporary USA phone number,” and “receive SMS online USA.” We target those intents with clear service pages and instant inbox delivery.`,
      `How it works. Sign up with email and password, add credit via WhatsApp deposit, then open Services → United States → pick your app → Buy. Copy the number, request the SMS from the app, and grab the OTP when it appears. No monthly lock-in — top up only what you need.`,
      `High-demand USA OTP routes: WhatsApp, Telegram, Google / Gmail, Instagram, Facebook, X (Twitter), TikTok, Discord, Binance, and OpenAI / ChatGPT. Inventory and acceptance can vary by app; live prices show before you confirm.`,
      `Privacy first: keep your personal cell off random signup forms, reduce spam risk, and separate work or travel accounts. Do not use temporary numbers to violate any service’s terms. Temp Empire markets disposable SMS OTP for legitimate verification and privacy.`,
      `Get your USA temporary number now — sign up, deposit, and buy from Services in under a minute.`,
    ].join("\n\n");
  }

  return [
    `Buy ${c} (${dial}) temporary phone numbers on Temp Empire to receive SMS OTP online. Private virtual numbers for WhatsApp, Telegram, Google and more — no physical SIM required.`,
    `Create an account, add wallet credit via WhatsApp deposit, choose ${name} and your service in the catalog, then read the verification code in the live OTP panel. Eligible orders that never receive SMS are refunded.`,
    `Use ${c} numbers for legitimate account verification and privacy. Always follow the destination app’s terms of service.`,
  ].join("\n\n");
}

export function seoHubFaqs(country: SeoCountry): SeoFaq[] {
  if (country.slug === "uk") {
    return [
      {
        q: "Can I buy a UK number for WhatsApp verification?",
        a: "Yes. Choose United Kingdom and WhatsApp in Services after you sign up and add credit. Paste the +44 number into WhatsApp and read the SMS OTP in your Temp Empire order panel.",
      },
      {
        q: "Do I need a UK SIM card or address?",
        a: "No. Temp Empire UK numbers are virtual receive-SMS lines delivered in your dashboard. No physical SIM, UK address, or ID check is required to buy OTP numbers here.",
      },
      {
        q: "How fast do UK SMS codes arrive?",
        a: "Most codes appear within seconds after the app sends the SMS. Watch the live OTP panel on your order — you can copy the code with one tap.",
      },
      {
        q: "What if the UK number does not receive SMS?",
        a: "Eligible orders that expire without an SMS are refunded to your wallet balance so you can try another number.",
      },
      {
        q: "How do I pay?",
        a: "Message our WhatsApp deposit line from the Deposit page with your account email and amount. After we confirm payment, your wallet is credited — then buy UK numbers from Services.",
      },
    ];
  }
  if (country.slug === "usa") {
    return [
      {
        q: "How do I get a temporary USA phone number?",
        a: "Sign up on Temp Empire, add wallet credit via WhatsApp deposit, open Services, select United States and your app, then buy. The +1 number appears instantly for SMS OTP.",
      },
      {
        q: "Can I receive SMS online with a USA virtual number?",
        a: "Yes. Incoming verification texts show in your live order panel. You do not need a US carrier plan or physical SIM.",
      },
      {
        q: "Which apps work with USA temp numbers?",
        a: "Common routes include WhatsApp, Telegram, Google, Instagram, TikTok, Discord, Facebook, X, and more. Availability depends on live stock for each service.",
      },
      {
        q: "Are these public free numbers?",
        a: "No. Numbers you buy are tied to your account session — not a public shared inbox — so your OTP stays private.",
      },
      {
        q: "What payment methods do you accept?",
        a: "Wallet top-ups are arranged over WhatsApp from the Deposit page. Once credited, you pay per number from your balance.",
      },
    ];
  }
  return [
    {
      q: `How do I buy a ${country.adjective} temporary number?`,
      a: `Create an account, deposit via WhatsApp, open Services, select ${country.name} and your app, then buy and wait for the OTP in the live panel.`,
    },
    {
      q: "What if SMS never arrives?",
      a: "Eligible failed deliveries are refunded to your wallet so you can purchase another number.",
    },
  ];
}

/** ~600-word consumer template — privacy / disposable / virtual SMS. */
export function seoArticleBody(country: SeoCountry, service: SeoService) {
  const c = country.adjective;
  const s = service.name;
  const dial = country.dial;

  const lead =
    country.slug === "uk"
      ? `Looking for a UK (+44) number for ${s} verification? Temp Empire sells private temporary UK phone numbers so you can receive ${s} SMS OTP online — without sharing your personal mobile or buying a British SIM.`
      : country.slug === "usa"
        ? `Need a USA (+1) temporary number for ${s}? Temp Empire lets you buy an American virtual SMS number, receive the ${s} verification code online, and keep your real phone private.`
        : `Looking for a private way to receive a ${s} verification code without sharing your personal phone? Temp Empire sells disposable ${c} virtual numbers for SMS OTP — so you can protect your privacy and get codes in seconds.`;

  return [
    lead,
    `A temporary phone number (also called a virtual SMS number or disposable number) is a short-lived line rented only for receiving text messages. When ${s} asks you to confirm a phone number, you paste the Temp Empire ${dial} number, wait for the one-time password in our live inbox, and finish signup. You are not buying a permanent SIM or carrier plan — just a verification route with an OTP window and refunds if SMS never arrives.`,
    `Why people choose a ${c} number for ${s}: local ${dial} routing often improves delivery for region-aware flows, and keeping work, travel, or secondary accounts separate from your main device reduces spam and account recovery risk. Temp Empire’s catalog covers ${country.name} alongside other countries, with clear live pricing from your wallet balance.`,
    `How it works in three steps. First, create an account with email and password. Second, open Deposit and message WhatsApp to add credit — we credit your wallet after confirming payment. Third, open Services, select ${country.name} and ${s}, buy a number, paste it into ${s}, then watch the live OTP panel — codes auto-appear and can be copied with one tap.`,
    `Privacy-first stance. We market disposable numbers and virtual SMS OTP for legitimate account verification and privacy hygiene — not for evading platform security or banned-account schemes. Always follow ${s}’s terms of service. If you only need a code for a personal or business signup and prefer not to publish your real mobile, a temporary number is the right tool.`,
    `Payments stay simple: WhatsApp deposits credit your wallet; each successful number purchase deducts only after a line is issued. Failed provider attempts do not keep your money. Support is available if deposits, OTP delivery, or account access need a human.`,
    `Ready to start? Buy a ${c} virtual number for ${s} OTP on Temp Empire, complete verification in minutes, and keep your personal phone private.`,
  ].join("\n\n");
}

export function seoServiceFaqs(country: SeoCountry, service: SeoService): SeoFaq[] {
  return [
    {
      q: `Can I use a ${country.adjective} number for ${service.name}?`,
      a: `Yes — after you sign up and add credit, buy a ${country.name} number for ${service.name} from Services and read the SMS OTP in your order panel.`,
    },
    {
      q: "Is the number private?",
      a: "Paid numbers are delivered to your account session. Unlike public free SMS sites, your code is not posted on a shared page.",
    },
    {
      q: "How do I pay for the number?",
      a: "Top up via WhatsApp on the Deposit page, then purchase from your wallet balance.",
    },
  ];
}

export const TOP_LONG_TAIL_KEYWORDS = [
  "buy UK virtual number for WhatsApp",
  "temporary UK phone number +44 SMS OTP",
  "UK number for WhatsApp verification",
  "receive SMS online UK",
  "buy USA virtual number for WhatsApp OTP",
  "temporary USA phone number receive SMS online",
  "USA temp number SMS verification",
  "disposable American phone number OTP",
  "buy temporary number WhatsApp deposit",
  "privacy virtual SMS OTP United Kingdom United States",
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

export function allSeoCountrySlugs() {
  return SEO_COUNTRIES.map((c) => ({ country: c.slug }));
}

export function faqJsonLd(faqs: SeoFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function serviceJsonLd(country: SeoCountry, service?: SeoService) {
  const name = service
    ? `${country.adjective} ${service.name} SMS OTP number`
    : `${country.adjective} temporary phone numbers for SMS OTP`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    serviceType: "SMS verification number",
    provider: {
      "@type": "Organization",
      name: "Temp Empire",
      url: "https://www.tempempire.store",
    },
    areaServed: { "@type": "Country", name: country.name },
    url: service
      ? `https://www.tempempire.store/buy/${country.slug}/${service.slug}`
      : `https://www.tempempire.store/buy/${country.slug}`,
    description: service
      ? seoPageDescription(country, service)
      : seoHubDescription(country),
  };
}
