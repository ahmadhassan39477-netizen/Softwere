/** Programmatic SEO catalog for /buy hubs and /buy/[country]/[service] pages. */

import { PAGE_META } from "@/lib/seo-meta";

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
      "us temp num",
      "temp num usa",
      "temp number",
      "buy USA virtual number",
      "temporary USA phone number",
      "receive SMS online USA",
      "USA temp number for WhatsApp",
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
      "uk temp num",
      "temp number",
      "buy UK virtual number",
      "temporary UK phone number",
      "UK number for WhatsApp verification",
      "receive SMS online UK +44",
    ],
  },
  {
    slug: "canada",
    code: "CA",
    name: "Canada",
    adjective: "Canada",
    flag: "🇨🇦",
    dial: "+1",
    keywords: [
      "temp num canada",
      "canada temp number",
      "temporary Canada phone number OTP",
      "Canada virtual number SMS",
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
export const PRIORITY_SEO_COUNTRIES = ["usa", "uk", "canada"] as const;

export function findSeoCountry(slug: string) {
  return SEO_COUNTRIES.find((c) => c.slug === slug);
}

export function findSeoService(slug: string) {
  return SEO_SERVICES.find((s) => s.slug === slug);
}

export function seoPageTitle(country: SeoCountry, service: SeoService) {
  if (service.slug === "facebook") {
    if (country.slug === "uk") return "Facebook OTP Number UK | Verification | Temp Empire";
    if (country.slug === "usa") return "Facebook OTP | US Temp Num Verification | Temp Empire";
    if (country.slug === "canada") return "Facebook OTP Canada | Temp Num Verification | Temp Empire";
    return `Facebook OTP | ${country.adjective} Temp Num | Temp Empire`;
  }
  if (service.slug === "whatsapp") {
    if (country.slug === "uk") return "OTP Website for WhatsApp | UK Temp Num | Temp Empire";
    if (country.slug === "usa") return "OTP Website for WhatsApp | US Temp Num | Temp Empire";
    if (country.slug === "canada") return "OTP Website for WhatsApp | Temp Num Canada | Temp Empire";
    return `OTP Website for WhatsApp | ${country.adjective} | Temp Empire`;
  }
  if (country.slug === "uk") {
    return `UK ${service.name} Temp Num | OTP Website | Temp Empire`;
  }
  if (country.slug === "usa") {
    return `US ${service.name} Temp Num | OTP Website | Temp Empire`;
  }
  if (country.slug === "canada") {
    return `Canada ${service.name} Temp Num | OTP Website | Temp Empire`;
  }
  return `${country.adjective} ${service.name} Temp Num | OTP Website | Temp Empire`;
}

export function seoPageDescription(country: SeoCountry, service: SeoService) {
  if (service.slug === "facebook") {
    if (country.slug === "uk") {
      return "Receive Facebook OTP on a UK temp num. Facebook OTP verification phone number, code not received help, and a private SMS inbox — not a public free-code wall.";
    }
    if (country.slug === "usa") {
      return "Get Facebook OTP verification on a US temp num. Facebook OTP number, verification phone number, and help if the Facebook OTP code is not received.";
    }
    if (country.slug === "canada") {
      return "Facebook OTP verification on a temp num Canada. Facebook OTP number and verification phone number — private SMS if the Facebook OTP code is not received.";
    }
    return `Facebook OTP verification on a ${country.adjective} temp number. Private Facebook OTP number and SMS inbox — not a public free-code wall.`;
  }
  if (service.slug === "whatsapp") {
    return `OTP website for WhatsApp: buy a ${country.adjective} (${country.dial}) temp number, receive the WhatsApp OTP online, keep your phone private. Sign up, then deposit on WhatsApp.`;
  }
  return `Get a private ${country.adjective} (${country.dial}) temp number for ${service.name} on this SMS OTP website. Receive verification codes online — no SIM. Sign up, deposit via WhatsApp, buy in seconds.`;
}

export function seoH1(country: SeoCountry, service: SeoService) {
  if (service.slug === "facebook") {
    if (country.slug === "usa") return "Facebook OTP verification on a US temp num";
    if (country.slug === "uk") return "Facebook OTP number — UK temp num verification";
    if (country.slug === "canada") return "Facebook OTP on a temp num Canada";
    return `Facebook OTP verification phone number (${country.adjective})`;
  }
  if (service.slug === "whatsapp") {
    if (country.slug === "uk") return "OTP website for WhatsApp — UK temp num (+44)";
    if (country.slug === "usa") return "OTP website for WhatsApp — US temp num (+1)";
    if (country.slug === "canada") return "OTP website for WhatsApp — temp num Canada";
    return `OTP website for WhatsApp — ${country.adjective} temp number`;
  }
  if (country.slug === "uk") {
    return `UK temp num for ${service.name} OTP (${country.dial})`;
  }
  if (country.slug === "usa") {
    return `US temp num for ${service.name} SMS verification`;
  }
  if (country.slug === "canada") {
    return `Temp num Canada for ${service.name} OTP`;
  }
  return `${country.adjective} temp number for ${service.name} OTP`;
}

export function seoHubTitle(country: SeoCountry) {
  if (country.slug === "uk") return PAGE_META.uk.title;
  if (country.slug === "usa") return PAGE_META.usa.title;
  if (country.slug === "canada") return PAGE_META.canada.title;
  return `${country.name} Temp Number | OTP Website | Temp Empire`;
}

export function seoHubDescription(country: SeoCountry) {
  if (country.slug === "uk") return PAGE_META.uk.description;
  if (country.slug === "usa") return PAGE_META.usa.description;
  if (country.slug === "canada") return PAGE_META.canada.description;
  return `Buy a ${country.adjective} (${country.dial}) temp number on this OTP website. Private SMS for WhatsApp OTP, Facebook OTP, and more — pay from your Temp Empire wallet after signup.`;
}

export function seoHubH1(country: SeoCountry) {
  if (country.slug === "uk") {
    return "UK temp num (+44) — temporary number for SMS OTP";
  }
  if (country.slug === "usa") {
    return "US temp num (+1) — temp num USA to receive SMS online";
  }
  if (country.slug === "canada") {
    return "Temp num Canada — temporary +1 number for SMS OTP";
  }
  return `${country.name} temp number for SMS OTP`;
}

/** Long-form hub copy — UK/USA get richer competitor-style content. */
export function seoHubArticle(country: SeoCountry): string {
  const dial = country.dial;
  const c = country.adjective;
  const name = country.name;

  if (country.slug === "uk") {
    return [
      `Looking for a UK temp num to receive SMS online? Temp Empire is an OTP website that sells private +44 temporary phone numbers — a temp number you can use for WhatsApp OTP, Facebook OTP verification, Telegram, Google, Instagram, Discord and other apps without sharing your personal mobile.`,
      `A UK temp num (also called a disposable UK mobile or British virtual SMS number) is a short-lived line you rent only to receive verification texts. When an app asks for a United Kingdom phone number, you paste the Temp Empire +44 number, wait for the one-time password in our live inbox, and finish signup. You are not buying a physical SIM, UK address, or carrier contract — just a private receive-SMS route with an OTP window.`,
      `People often search for a temp num free or a free virtual number OTP website. Public shared inboxes post other people’s SMS for anyone to read. A paid UK temp num on Temp Empire keeps your code in your account. Temp Mail Plus-style email aliases are free to generate after you sign in.`,
      `How to buy a UK temp num in three steps. First, create an account (email and password). Second, open Deposit and message WhatsApp from Deposit after you sign in to add wallet credit. Third, open Services, choose United Kingdom and your app, buy a number, paste it into the app, and watch the live OTP panel. If SMS never arrives, eligible orders refund to your balance.`,
      `Popular UK OTP use cases: OTP website for WhatsApp with a +44 line, Facebook OTP number and verification phone number, Telegram SMS login, Google / Gmail, Instagram, TikTok, Discord, and X. Always follow each app’s terms — we help you receive SMS, not evade platform rules.`,
      `Compared with monthly rental SIMs, pay-per-OTP fits one-off checks. Browse the service links below or go straight to Services after you sign up.`,
      `Ready to start? Buy a UK temp num on this temp OTP website, complete verification in minutes, and keep your personal phone private.`,
    ].join("\n\n");
  }

  if (country.slug === "usa") {
    return [
      `Need a US temp num to receive SMS online? Temp Empire is an SMS OTP website with private American (+1) virtual numbers — temp num USA routes for WhatsApp OTP, Facebook OTP verification, Telegram, Google, Instagram, TikTok, Discord and more, without a US SIM card.`,
      `A US temp num is a short-lived virtual SMS line. When a site asks for a United States phone number, you purchase a +1 temp number from Temp Empire, enter it on the form, and read the code in your live order panel. Pay only when a number is issued; eligible failed deliveries refund to your wallet.`,
      `Searchers look for “us temp num,” “temp num usa,” and “temp number.” We match that intent with a private inbox — not a public temp num free wall where anyone can read your Facebook OTP or WhatsApp code.`,
      `How it works. Sign up with email and password, add credit via WhatsApp from Deposit after you sign in, then open Services → United States → pick your app → Buy. Copy the number, request the SMS, and grab the OTP when it appears.`,
      `High-demand USA routes: OTP website for WhatsApp, Facebook OTP number, Telegram, Google / Gmail, Instagram, X, TikTok, Discord, Binance, and OpenAI / ChatGPT. Inventory can vary; live prices show before you confirm.`,
      `Privacy first: keep your personal cell off random signup forms. Do not use a temporary number to violate any service’s terms. Temp Empire is for legitimate verification and privacy.`,
      `Get your US temp num now — sign up, deposit, and buy from Services in under a minute.`,
    ].join("\n\n");
  }

  if (country.slug === "canada") {
    return [
      `Need a temp num Canada to receive SMS online? Temp Empire sells private Canadian (+1) temporary numbers on this OTP website — a Canada temp number for WhatsApp OTP, Facebook OTP verification, Telegram, Google and other apps, without a Canadian SIM.`,
      `A temp num Canada is a short-lived virtual SMS line. When a site wants a Canadian phone number, you buy the +1 number here, paste it into the app, and read the OTP in your live panel. Eligible failed deliveries refund to your wallet.`,
      `How to buy. Create an account, message WhatsApp from Deposit after you sign in from Deposit, then open Services → Canada → choose your app. Signup stays required before OTP.`,
      `Use a Canada temp number for legitimate account checks and privacy — never to break an app’s rules. Pair it with Temp Mail Plus-style disposable email if you also want to keep your real inbox private.`,
      `Browse WhatsApp, Facebook OTP, Telegram, Google and more below, or sign up to buy from live stock.`,
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
        q: "Can I buy a UK temp num for WhatsApp OTP?",
        a: "Yes. This is an OTP website for WhatsApp: after you sign up and add credit, choose United Kingdom and WhatsApp in Services. Paste the +44 UK temp num and read the SMS in your order panel.",
      },
      {
        q: "Do I need a UK SIM card or address?",
        a: "No. A UK temp num here is a virtual receive-SMS line. No physical SIM, UK address, or ID check is required to buy OTP numbers.",
      },
      {
        q: "Is there a temp num free on this OTP website?",
        a: "Public “temp num free” pages share codes with everyone. Temp Empire sells a private temp number from your wallet. Temp Mail Plus-style email aliases are free after you sign in.",
      },
      {
        q: "What if the UK number does not receive SMS?",
        a: "Eligible orders that expire without an SMS are refunded to your wallet so you can try another temp number.",
      },
      {
        q: "How do I pay?",
        a: "Message WhatsApp from Deposit after you sign in from the Deposit page with your account email and amount. After we confirm payment, buy a UK temp num from Services.",
      },
    ];
  }
  if (country.slug === "usa") {
    return [
      {
        q: "How do I get a US temp num?",
        a: "Sign up, add wallet credit via WhatsApp from Deposit after you sign in, open Services, select United States and your app, then buy. The +1 temp num USA appears instantly for SMS OTP.",
      },
      {
        q: "Can I receive SMS online with a US temp num?",
        a: "Yes. Incoming verification texts show in your live order panel. You do not need a US carrier plan or physical SIM.",
      },
      {
        q: "Which apps work with a temp num USA?",
        a: "Common routes include WhatsApp OTP, Facebook OTP verification, Telegram, Google, Instagram, TikTok, Discord, and X. Availability depends on live stock.",
      },
      {
        q: "Is this a free virtual number OTP website?",
        a: "No shared public inbox. A temp num free wall would expose your code. You pay for a private US temp num; Temp Mail Plus email is free to generate after signup.",
      },
      {
        q: "What payment methods do you accept?",
        a: "Wallet top-ups are arranged over WhatsApp from Deposit after you sign in from the Deposit page. Once credited, you pay per temp number from your balance.",
      },
    ];
  }
  if (country.slug === "canada") {
    return [
      {
        q: "How do I buy a temp num Canada?",
        a: "Create an account, deposit via WhatsApp from Deposit after you sign in, open Services, select Canada and your app, then buy. The +1 Canada temp number appears in your OTP panel.",
      },
      {
        q: "Does a temp num Canada work for WhatsApp and Facebook OTP?",
        a: "Often yes when stock is live — this OTP website lists WhatsApp, Facebook OTP, Telegram, Google and more under Canada. Always follow each app’s terms.",
      },
      {
        q: "What if SMS never arrives?",
        a: "Eligible failed deliveries refund to your wallet so you can purchase another Canada temp number.",
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

  if (service.slug === "facebook") {
    const place =
      country.slug === "usa"
        ? "a US temp num"
        : country.slug === "uk"
          ? "a UK temp num"
          : country.slug === "canada"
            ? "a temp num Canada"
            : `a ${c} temp number`;
    return [
      `Need Facebook OTP verification without sharing your personal mobile? Temp Empire is an SMS OTP website where you rent ${place} (${dial}) as your Facebook OTP number — then read the Facebook OTP in a private live inbox.`,
      `A Facebook OTP verification phone number here is a short-lived virtual SMS line. When Facebook asks for a phone number, paste the Temp Empire ${dial} number, request the SMS from Facebook, and copy the code when it arrives. We help you receive SMS. We do not help anyone skip or evade Facebook’s checks.`,
      `People search for a Facebook OTP code free or a public dump of codes. Those sites post other people’s texts. Temp Empire does not list shared Facebook OTP codes. You buy a private Facebook OTP number so only your account sees the SMS.`,
      `Facebook OTP code not received? Watch the live panel for the full window. If the Facebook OTP never lands, eligible orders refund to your wallet so you can try another temp number. Signup is required before you can buy.`,
      `How it works. Create an account, message WhatsApp from Deposit after you sign in from Deposit, open Services, choose ${country.name} and Facebook, buy, then paste the number into Facebook. Pair it with Temp Mail Plus-style email if you also want a disposable inbox.`,
      `Always follow Facebook’s terms. Use this Facebook OTP route for legitimate verification and privacy — not for banned-account schemes.`,
    ].join("\n\n");
  }

  if (service.slug === "whatsapp") {
    return [
      `This is an OTP website for WhatsApp: buy a ${c} (${dial}) temp number, receive the WhatsApp OTP online, and keep your real phone private.`,
      `Sign up (required before OTP), add credit via WhatsApp from Deposit after you sign in, choose ${country.name} and WhatsApp in Services, paste the temp number into WhatsApp, and copy the code from the live panel.`,
      `Public temp num free pages share WhatsApp codes with strangers. A paid private number on this temp OTP website keeps the SMS in your account. Eligible “code not received” orders refund to your wallet.`,
      `Use WhatsApp OTP for legitimate verification only. Follow WhatsApp’s terms — we provide receive-SMS, not a way around their rules.`,
    ].join("\n\n");
  }

  const lead =
    country.slug === "uk"
      ? `Looking for a UK temp num (${dial}) for ${s} verification? Temp Empire is an OTP website with private UK temporary numbers so you can receive ${s} SMS online — without sharing your personal mobile.`
      : country.slug === "usa"
        ? `Need a US temp num (${dial}) for ${s}? This SMS OTP website lets you buy a temp num USA, receive the ${s} verification code online, and keep your real phone private.`
        : country.slug === "canada"
          ? `Need a temp num Canada for ${s}? Buy a Canada temp number on this OTP website, receive the ${s} code online, and keep your personal phone private.`
          : `Looking for a private way to receive a ${s} verification code? Temp Empire sells a ${c} temp number for SMS OTP — protect your privacy and get codes in seconds.`;

  return [
    lead,
    `A temp number (also called a virtual SMS number) is a short-lived line rented only for receiving text messages. When ${s} asks you to confirm a phone number, you paste the Temp Empire ${dial} number, wait for the one-time password in our live inbox, and finish signup. Refunds apply if SMS never arrives.`,
    `Why people choose a ${c} temp number for ${s}: local ${dial} routing often helps region-aware flows, and keeping work or travel accounts off your main device reduces spam. Live prices come from your wallet after a WhatsApp deposit.`,
    `How it works. Create an account, message WhatsApp from Deposit after you sign in from Deposit, open Services, select ${country.name} and ${s}, buy, paste the number, then copy the OTP.`,
    `We market disposable numbers for legitimate verification and privacy — not for evading platform security. Always follow ${s}’s terms.`,
    `Ready to start? Buy a ${c} temp number for ${s} on this temp OTP website and keep your personal phone private.`,
  ].join("\n\n");
}

export function seoServiceFaqs(country: SeoCountry, service: SeoService): SeoFaq[] {
  if (service.slug === "facebook") {
    return [
      {
        q: "How do I get a Facebook OTP verification phone number?",
        a: `Sign up, deposit on WhatsApp from Deposit after you sign in, then buy a ${country.adjective} Facebook OTP number from Services. Paste it into Facebook and read the Facebook OTP in your panel.`,
      },
      {
        q: "Do you give a Facebook OTP code free from a public list?",
        a: "No. A “Facebook OTP code free” search usually means a shared dump. We never post other people’s Facebook OTP. You receive your own SMS on a private temp number.",
      },
      {
        q: "Facebook OTP code not received — what now?",
        a: "Wait for the live window. If the Facebook OTP never arrives, eligible orders refund to your wallet so you can try another Facebook OTP number.",
      },
      {
        q: "Is this for skipping Facebook checks?",
        a: "No. Temp Empire only helps you receive SMS for legitimate Facebook OTP verification. Follow Facebook’s terms.",
      },
    ];
  }
  if (service.slug === "whatsapp") {
    return [
      {
        q: `Is Temp Empire an OTP website for WhatsApp?`,
        a: `Yes. After signup you can buy a ${country.adjective} temp number for WhatsApp OTP and read the SMS in your inbox.`,
      },
      {
        q: "Is the WhatsApp temp number private?",
        a: "Paid numbers stay on your account. Unlike a temp num free public page, your WhatsApp OTP is not posted for strangers.",
      },
      {
        q: "How do I pay?",
        a: "Top up via WhatsApp from Deposit after you sign in on the Deposit page, then purchase from your wallet.",
      },
    ];
  }
  return [
    {
      q: `Can I use a ${country.adjective} temp number for ${service.name}?`,
      a: `Yes — after you sign up and add credit, buy a ${country.name} temp number for ${service.name} from Services and read the SMS OTP in your order panel.`,
    },
    {
      q: "Is the number private?",
      a: "Paid numbers are delivered to your account session. Unlike public free SMS sites, your code is not posted on a shared page.",
    },
    {
      q: "How do I pay for the number?",
      a: "Top up via WhatsApp from Deposit after you sign in on the Deposit page, then purchase from your wallet balance.",
    },
  ];
}

export const TOP_LONG_TAIL_KEYWORDS = [
  "us temp num",
  "temp number",
  "temp num free",
  "uk temp num",
  "temp num canada",
  "temp num usa",
  "facebook otp verification",
  "facebook otp",
  "sms otp website",
  "otp website for whatsapp",
  "temp otp website",
  "temp mail plus",
] as const;

export function seoHubServicesH2(country: SeoCountry) {
  if (country.slug === "uk") return "UK temp num for WhatsApp, Facebook OTP, and more";
  if (country.slug === "usa") return "US temp num for Facebook OTP, WhatsApp, and more";
  if (country.slug === "canada") return "Temp num Canada for WhatsApp, Facebook OTP, and more";
  return `Popular ${country.adjective} OTP services`;
}

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
