/** Long-form public guide: disposable phone number + temp mail (honest receive-only). */

import { PAGE_META } from "@/lib/seo-meta";
import type { SeoFaq } from "@/lib/seo-catalog";

export const DISPOSABLE_GUIDE_PATH = "/guides/disposable-phone-number";
export const DISPOSABLE_GUIDE_URL = `https://www.tempempire.store${DISPOSABLE_GUIDE_PATH}`;
export const DISPOSABLE_GUIDE_PUBLISHED = "2026-10-19";

export const DISPOSABLE_GUIDE_KEYWORDS = [
  "disposable phone number",
  "temporary phone number",
  "SIM swapping",
  "SIM-swapping",
  "temp mail",
  "disposable email address",
  "fake email generator",
  "throwaway email",
  "temporary email",
  "temp number",
  "dating apps Tinder Bumble Hinge",
  "reverse phone lookup",
  "two-factor authentication",
  "OTP",
  "virtual phone numbers",
] as const;

export const DISPOSABLE_GUIDE_H1 = "What is a disposable phone number?";

export const DISPOSABLE_GUIDE_INTRO = [
  "Every time you put your mobile on a dating app, a store checkout, or a public form, you leave a trail. A disposable phone number is a short-lived virtual SMS line so you can receive an OTP without handing over your personal SIM.",
  "This page covers a temporary phone number, SIM-swapping risk on non-bank apps, and temp mail on the same Temp Empire account. Guests can read. Temp Mail, Services, VPN, and Deposit still need sign up. Wallet credit is a WhatsApp deposit after you log in.",
] as const;

export type DisposableGuideSection = {
  id: string;
  h2: string;
  body: readonly string[];
  h3?: string;
  steps?: readonly { t: string; d: string }[];
};

export const DISPOSABLE_GUIDE_SECTIONS: readonly DisposableGuideSection[] = [
  {
    id: "what-is-a-disposable-phone-number",
    h2: "What a disposable phone number is",
    body: [
      "A disposable phone number — also called a temporary phone number or a temp number — is a virtual SMS inbox. You rent it, paste it into an app yourself, read the OTP, and you are done. You are not buying a carrier plan or a physical SIM.",
    ],
    h3: "How virtual phone numbers work for OTP",
    steps: [
      {
        t: "Rent a virtual line",
        d: "Virtual phone numbers on Temp Empire cover 224 countries. Stock varies by hour. Pick a country and app in Services after you sign in.",
      },
      {
        t: "Receive the OTP",
        d: "Paste the temp number yourself. Watch the private inbox. You have at least 20 minutes. If the SMS never arrives, eligible orders auto-refund to your wallet.",
      },
    ],
  },
  {
    id: "dating-apps",
    h2: "Why not use your real number on dating apps",
    body: [
      "To sign up for dating apps Tinder Bumble Hinge, the form usually asks for a phone. Using your real SIM can expose you to reverse phone lookup, spam, and follow-up texts if a match goes badly.",
    ],
    h3: "Reverse phone lookup, harassment, and leaks",
    steps: [
      {
        t: "Reverse phone lookup",
        d: "Anyone who sees your real number can try a reverse phone lookup. A rented temp number keeps that lookup off your personal line.",
      },
      {
        t: "Harassment and leaks",
        d: "Blocking someone in-app does not always stop texts to a real SIM. If a dating app leaks data, that number can land on spam lists. We do not promise a dating profile will stay hidden forever.",
      },
    ],
  },
  {
    id: "sim-swapping",
    h2: "How temporary numbers relate to SIM-swapping",
    body: [
      "SIM swapping (also written SIM-swapping) is when someone tricks a mobile carrier into moving your number onto their SIM, then intercepts two-factor authentication texts.",
    ],
    h3: "Use a temp number for non-bank apps",
    steps: [
      {
        t: "Keep the real SIM off random forms",
        d: "Use a Temp Empire temp number for non-bank apps — dating, newsletters, one-off signups — so your real SIM stays off those forms.",
      },
      {
        t: "Do not treat this as bank 2FA cover",
        d: "A rented line is not protection for banking two-factor authentication. Keep bank 2FA on a number you control and follow your bank’s own rules.",
      },
    ],
  },
  {
    id: "why-temp-empire",
    h2: "Why people pick Temp Empire for a temp number",
    body: [
      "Temp Empire is an independent shop on www.tempempire.store. You sign up, add wallet credit from Deposit after you log in, then buy a private inbox. This is not a public wall of other people’s codes.",
    ],
    h3: "20-minute wait and auto-refund",
    steps: [
      {
        t: "Wait 20 minutes",
        d: "If the OTP is not received within 20 minutes, eligible orders auto-refund. Numbers are virtual SMS, not physical carrier SIMs.",
      },
      {
        t: "WhatsApp deposit after login",
        d: "The deposit chat is only shown after you sign in — not on this public page. We do not take wallet top-ups on this article.",
      },
    ],
  },
  {
    id: "what-is-temporary-email",
    h2: "What is a temporary email?",
    body: [
      "A disposable email address — a temporary email or throwaway email — is a short-lived inbox for welcome mail and confirm links. Pair it with a temp number when an app wants both.",
    ],
    h3: "Temp mail on Temp Empire still needs an account",
    steps: [
      {
        t: "Not a no-login fake email generator",
        d: "Some sites market a fake email generator with no login. On Temp Empire, temp mail still needs an account. Sign up, then create the alias. We do not issue mail without registration.",
      },
      {
        t: "Read mail in your account",
        d: "After you sign in, open Temp Mail Plus, generate a disposable email address, and read mail in the live inbox. Wallet credit is not required for email.",
      },
    ],
  },
  {
    id: "why-temp-mail",
    h2: "Why you need temp mail for online privacy",
    body: [
      "Mixing untrusted sites with your main inbox invites spam and tracking pixels. A throwaway email on your Temp Empire account keeps those messages off work mail.",
    ],
    h3: "Receive mail for your own signups",
    steps: [
      {
        t: "Your own confirmations",
        d: "If a page asks for an email before you can read it, use temp mail to receive that mail for your own signup. Follow the site’s rules. We do not help anyone skip security checks.",
      },
    ],
  },
  {
    id: "combo",
    h2: "Temp mail + OTP on one account",
    body: [
      "You do not need one site for mail and another for SMS. After you sign in, Temp Mail Plus and the number shop sit on the same account. Pair a disposable email address with a temporary phone number for your own signups. We do not claim fully hidden accounts or a vanished record.",
    ],
  },
];

export const DISPOSABLE_GUIDE_STEPS_INTRO =
  "How do I get a disposable phone number and temp mail on Temp Empire? Same account for both.";

export const DISPOSABLE_GUIDE_STEPS = [
  {
    n: "1",
    t: "Create an account",
    d: "Sign up at www.tempempire.store. Guests can read this page; they cannot open Temp Mail, Services, VPN, or Deposit until they have an account.",
  },
  {
    n: "2",
    t: "Add wallet credit",
    d: "Sign in, open Deposit, and message us on WhatsApp to add credit. The deposit chat is only shown after you log in — not on this public guide.",
  },
  {
    n: "3",
    t: "Open Services or Temp Mail",
    d: "Buy a temp number from Services (US and UK hubs are the usual start), or generate a disposable email address in Temp Mail Plus.",
  },
  {
    n: "4",
    t: "Paste it yourself",
    d: "Enter the temporary phone number or temporary email on the app you are signing up for. Temp Empire receives SMS and mail; you still complete that app’s own screen.",
  },
  {
    n: "5",
    t: "Read the OTP",
    d: "Watch the live inbox for 20 minutes. If the SMS never arrives, eligible orders auto-refund so you can try another temp number.",
  },
] as const;

export const DISPOSABLE_GUIDE_FAQS: SeoFaq[] = [
  {
    q: "What is a disposable phone number?",
    a: "A disposable phone number is a short-lived virtual SMS line — the same idea as a temporary phone number or temp number. You rent it for one OTP, read the text in a private inbox, and keep your personal SIM off the form.",
  },
  {
    q: "How do temporary numbers relate to SIM swapping?",
    a: "SIM swapping / SIM-swapping is a carrier-side attack on your real mobile. Using a temp number for non-bank apps keeps that real SIM off dating and random forms. It is not a shield for banking two-factor authentication.",
  },
  {
    q: "What is temp mail or a disposable email address?",
    a: "Temp mail is a temporary email inbox. A disposable email address (also a throwaway email) receives welcome mail and confirm links. On Temp Empire you sign in first, then generate the alias — this is not a no-login fake email generator.",
  },
  {
    q: "Do I need to register for temp mail?",
    a: "Yes. Temp Mail, Services, VPN, and Deposit all need an account. Guests may read this guide. Wallet credit is a WhatsApp deposit after you log in.",
  },
  {
    q: "Can I use a temp number on dating apps Tinder Bumble Hinge?",
    a: "Yes, when stock is live: paste a temp number instead of your SIM so reverse phone lookup and later texts hit the rented line. Follow each app’s rules. Stock varies; refund if no SMS in 20 minutes.",
  },
  {
    q: "Are these virtual phone numbers or physical SIMs?",
    a: "Virtual phone numbers for SMS across 224 countries. Not physical carrier SIMs. Success depends on live stock. We do not promise every OTP will land.",
  },
];

export function disposableGuidePlainText() {
  const { title, description } = PAGE_META.disposableGuide;
  const sections = DISPOSABLE_GUIDE_SECTIONS.flatMap((s) => [
    s.h2,
    ...s.body,
    s.h3 ?? "",
    ...(s.steps ?? []).map((step) => `${step.t} ${step.d}`),
  ]).join("\n");
  const steps = [
    DISPOSABLE_GUIDE_STEPS_INTRO,
    ...DISPOSABLE_GUIDE_STEPS.map((s) => `${s.t} ${s.d}`),
  ].join("\n");
  const faqs = DISPOSABLE_GUIDE_FAQS.map((f) => `${f.q} ${f.a}`).join("\n");
  return [title, description, DISPOSABLE_GUIDE_H1, ...DISPOSABLE_GUIDE_INTRO, sections, steps, faqs].join(
    "\n",
  );
}

export function disposableArticleJsonLd() {
  const { title, description } = PAGE_META.disposableGuide;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: DISPOSABLE_GUIDE_PUBLISHED,
    dateModified: DISPOSABLE_GUIDE_PUBLISHED,
    inLanguage: "en",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": DISPOSABLE_GUIDE_URL,
    },
    author: {
      "@type": "Organization",
      name: "Temp Empire",
      url: "https://www.tempempire.store",
    },
    publisher: {
      "@type": "Organization",
      name: "Temp Empire",
      url: "https://www.tempempire.store",
      logo: {
        "@type": "ImageObject",
        url: "https://www.tempempire.store/icon-192.png",
        width: 192,
        height: 192,
      },
    },
    image: "https://www.tempempire.store/og-image.png",
    keywords: DISPOSABLE_GUIDE_KEYWORDS.join(", "),
  };
}
