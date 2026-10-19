/** Long-form public guide: Temp Empire Reseller API (real /api/v1 + SSE/poll). */

import { PAGE_META } from "@/lib/seo-meta";
import type { SeoFaq } from "@/lib/seo-catalog";

export const RESELLER_API_GUIDE_PATH = "/guides/reseller-api";
export const RESELLER_API_GUIDE_URL = `https://www.tempempire.store${RESELLER_API_GUIDE_PATH}`;
export const RESELLER_API_GUIDE_PUBLISHED = "2026-10-19";

export const RESELLER_API_GUIDE_KEYWORDS = [
  "Temp Empire Reseller API",
  "SMS OTP API",
  "automate SMS verification",
  "virtual phone API",
  "reseller REST API",
  "order_id",
  "SSE",
  "developer API keys",
] as const;

export const RESELLER_API_GUIDE_H1 =
  "How to automate SMS verifications with the Temp Empire Reseller API";

export const RESELLER_API_GUIDE_INTRO = [
  "The Temp Empire Reseller API is the public SMS OTP API for developers who already run their own apps, SaaS products, QA suites, or agency accounts. Buying one virtual number in the browser works; a reseller REST API is faster when you need the same purchase, wait, and refund flow from a script.",
  "This virtual phone API uses the live routes on www.tempempire.store. Guests can read this page. Generating developer API keys, calling /api/v1, and opening the gated API docs still need an account. Use it to receive SMS for accounts you operate — not to skip an app’s own checks.",
] as const;

export type ResellerApiGuideSection = {
  id: string;
  h2: string;
  body: readonly string[];
  h3?: string;
  steps?: readonly { t: string; d: string }[];
  code?: { title: string; text: string };
};

export const RESELLER_API_GUIDE_SECTIONS: readonly ResellerApiGuideSection[] = [
  {
    id: "why-developers",
    h2: "Why developers choose the Temp Empire Reseller API",
    body: [
      "One integration covers the catalog, purchase, OTP read, cancel, and balance. You do not stitch a new HTTP client for every country route. Primary, Backup, and Extra (server 1, 2, and 3 in the JSON) are three pools on the same key.",
      "Wallet debit happens inside a database transaction after a number is reserved. A failed buy does not take credit. Purchases are rate-limited per account so a tight loop cannot stampede the shop.",
      "OTP delivery is Server-Sent Events (SSE) in a signed-in browser, or HTTP polling with your API key. There are no OTP webhooks. If you see webhook samples on another site, they are not this API.",
    ],
  },
  {
    id: "auth-keys",
    h2: "Authenticate with developer API keys",
    body: [
      "Sign up, then open API docs / generate keys. Settings stores a key that starts with te_live_. Send it as X-Api-Key or Authorization: Bearer on every /api/v1 call. Rotate it from Settings; the old value stops working.",
      "The gated /api-docs page is the in-app cheat sheet. This article is the public SEO guide. Logged-out visitors who tap API docs / generate keys go through register, then land on /api-docs.",
    ],
  },
  {
    id: "core-workflow",
    h2: "Core API workflow: from purchase to OTP capture",
    body: [
      "Integrating the Temp Empire reseller REST API into Python, Node.js, PHP, or cURL follows a three-step lifecycle. Country codes are ISO (US, GB, IN). App names are service slugs such as whatsapp, telegram, or facebook. server is 1, 2, 3, or \"auto\" (Primary → Backup → Extra).",
    ],
    h3: "Three steps from catalog to code",
    steps: [
      {
        t: "Fetch available stock and rates",
        d: "GET /api/v1/countries, then GET /api/v1/services?country=US&q=whatsapp. Add live=1 when you want live stock and prices overlaid on the catalog. Each offer lists server 1, 2, or 3.",
      },
      {
        t: "Request a dedicated number",
        d: "POST /api/v1/purchase with countryCode, serviceSlug, and server. The JSON returns order.id (store it as order_id) and order.phoneNumber. POST /api/buy-number is the same buy with orderId and phoneNumber at the top level.",
      },
      {
        t: "Stream or poll for the OTP payload",
        d: "Scripts with an API key poll GET /api/v1/otp/{id}. A signed-in browser can open GET /api/orders/stream?orderId= (SSE; legacy GET /api/stream/otp/{id}). When SMS arrives, status is RECEIVED with code and message. If nothing arrives in 20 minutes, the order auto-refunds.",
      },
    ],
    code: {
      title: "Python — catalog, purchase, poll",
      text: `import requests

BASE = "https://www.tempempire.store"
headers = {"X-Api-Key": "te_live_YOUR_API_KEY"}

countries = requests.get(f"{BASE}/api/v1/countries", headers=headers).json()
services = requests.get(
    f"{BASE}/api/v1/services",
    params={"country": "US", "q": "whatsapp", "live": "1"},
    headers=headers,
).json()
bought = requests.post(
    f"{BASE}/api/v1/purchase",
    json={"countryCode": "US", "serviceSlug": "whatsapp", "server": "auto"},
    headers=headers,
).json()
order_id = bought["order"]["id"]
phone_number = bought["order"]["phoneNumber"]
otp = requests.get(f"{BASE}/api/v1/otp/{order_id}", headers=headers).json()`,
    },
  },
  {
    id: "real-endpoints",
    h2: "SMS OTP API endpoints that actually exist",
    body: [
      "Match these paths. Do not invent webhook URLs, crypto callbacks, or an /order/status alias — OTP status is GET /api/v1/otp/{id}.",
    ],
    h3: "v1 surface plus SSE",
    steps: [
      {
        t: "GET /api/v1/countries",
        d: "World list with optional ?q= search. Requires your key.",
      },
      {
        t: "GET /api/v1/services?country=US",
        d: "Optional q and live=1. Offers include server, price, stock, inStock.",
      },
      {
        t: "POST /api/v1/purchase",
        d: "Body: countryCode, serviceSlug, server (1 | 2 | 3 | \"auto\"). Returns { order } with id, phoneNumber, status, price, server, expiresAt.",
      },
      {
        t: "GET /api/v1/otp/{id}",
        d: "Poll until RECEIVED, or until CANCELLED / REFUNDED / EXPIRED. Fields: status, code, message, expiresAt.",
      },
      {
        t: "GET /api/orders/stream?orderId=",
        d: "SSE for a logged-in browser session (cookie), not the API key. Event types: connected, wait, otp, error. Polling is the reseller-script path.",
      },
      {
        t: "POST /api/v1/cancel/{id}",
        d: "Cancel an open order and refund. GET /api/v1/balance returns USD wallet, email.",
      },
    ],
  },
  {
    id: "sse-not-webhooks",
    h2: "SSE and polling only — no OTP webhooks",
    body: [
      "Incoming SMS is not POSTed to your server. Browser panels use SSE on /api/orders/stream?orderId=. Reseller scripts should poll /api/v1/otp/{id} (rate-limited). That is the full real-time surface.",
      "Wait at least 20 minutes. Eligible orders auto-refund if the SMS never arrives. You can also POST cancel before the window ends. Follow each destination app’s rules; this SMS OTP API receives texts for accounts you operate.",
    ],
  },
] as const;

export const RESELLER_API_GUIDE_STEPS_INTRO =
  "How to automate SMS verification on Temp Empire from zero: account, credit, key, then the three HTTP calls.";

export const RESELLER_API_GUIDE_STEPS = [
  {
    n: "1",
    t: "Create an account",
    d: "Sign up at www.tempempire.store. Guests can read this guide. Keys and /api/v1 still need a login.",
  },
  {
    n: "2",
    t: "Add wallet credit",
    d: "Sign in, open Deposit, and add credit. The deposit chat is only shown after you log in — not on this public page.",
  },
  {
    n: "3",
    t: "Generate developer API keys",
    d: "Open API docs / generate keys (or Settings). Copy the te_live_ key. Send X-Api-Key on every request.",
  },
  {
    n: "4",
    t: "Purchase a virtual number",
    d: "POST /api/v1/purchase. Save order.id as order_id and paste order.phoneNumber into the app you operate.",
  },
  {
    n: "5",
    t: "Poll or listen for the OTP",
    d: "Poll GET /api/v1/otp/{id}, or use SSE in the dashboard. After 20 minutes with no SMS, credit auto-refunds.",
  },
] as const;

export const RESELLER_API_GUIDE_FAQS: SeoFaq[] = [
  {
    q: "What is the Temp Empire Reseller API?",
    a: "A reseller REST API (SMS OTP API) on www.tempempire.store. After you create an account and generate developer API keys, you can list countries, buy a virtual number, poll or SSE for the OTP, cancel, and read USD balance.",
  },
  {
    q: "How do I automate SMS verification with a virtual phone API?",
    a: "Call GET /api/v1/services, POST /api/v1/purchase, then poll GET /api/v1/otp/{id}. Store order.id as order_id. That is how you automate SMS verification for apps, SaaS, QA, or agency accounts you operate.",
  },
  {
    q: "Does the API send OTP webhooks?",
    a: "No. There are no OTP webhooks. Use SSE at GET /api/orders/stream?orderId= in a signed-in browser, or poll GET /api/v1/otp/{id} with your API key.",
  },
  {
    q: "How long do I wait for SMS?",
    a: "At least 20 minutes. If the SMS never arrives, eligible orders auto-refund to your wallet so you can buy again.",
  },
  {
    q: "What are server 1, 2, and 3?",
    a: "The same three pools as the shop tabs: Primary, Backup, and Extra. Send server 1, 2, 3, or \"auto\" (tries 1 then 2 then 3). Stock changes; none is a promised win.",
  },
  {
    q: "Where do I generate developer API keys?",
    a: "Sign up, then API docs / generate keys. The in-app page is /api-docs; Settings can rotate the key. Guests who tap that CTA go through register first.",
  },
];

export function resellerApiGuidePlainText() {
  const { title, description } = PAGE_META.resellerApiGuide;
  const sections = RESELLER_API_GUIDE_SECTIONS.flatMap((s) => [
    s.h2,
    ...s.body,
    s.h3 ?? "",
    ...(s.steps ?? []).map((step) => `${step.t} ${step.d}`),
    s.code?.title ?? "",
    s.code?.text ?? "",
  ]).join("\n");
  const steps = [
    RESELLER_API_GUIDE_STEPS_INTRO,
    ...RESELLER_API_GUIDE_STEPS.map((s) => `${s.t} ${s.d}`),
  ].join("\n");
  const faqs = RESELLER_API_GUIDE_FAQS.map((f) => `${f.q} ${f.a}`).join("\n");
  return [title, description, RESELLER_API_GUIDE_H1, ...RESELLER_API_GUIDE_INTRO, sections, steps, faqs].join(
    "\n",
  );
}

export function resellerApiArticleJsonLd() {
  const { title, description } = PAGE_META.resellerApiGuide;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: RESELLER_API_GUIDE_PUBLISHED,
    dateModified: RESELLER_API_GUIDE_PUBLISHED,
    inLanguage: "en",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": RESELLER_API_GUIDE_URL,
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
    keywords: RESELLER_API_GUIDE_KEYWORDS.join(", "),
  };
}
