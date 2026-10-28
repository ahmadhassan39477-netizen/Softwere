/** Marketing + UI reference copy aligned with seed catalog (countries/services/pricing). */

export const CATALOG_SERVICES = [
  { name: "WhatsApp", slug: "whatsapp", category: "Messaging", from: "0.42", note: "Popular messaging OTP" },
  { name: "Telegram", slug: "telegram", category: "Messaging", from: "0.34", note: "Fast delivery pools" },
  { name: "Google / Gmail", slug: "google", category: "Accounts", from: "0.50", note: "Account verification" },
  { name: "OpenAI / ChatGPT", slug: "openai", category: "AI", from: "0.66", note: "Premium route" },
  { name: "Discord", slug: "discord", category: "Messaging", from: "0.30", note: "Community signups" },
  { name: "TikTok", slug: "tiktok", category: "Social", from: "0.46", note: "Creator & ads" },
  { name: "Instagram", slug: "instagram", category: "Social", from: "0.43", note: "Business & personal" },
  { name: "Facebook", slug: "facebook", category: "Social", from: "0.30", note: "Facebook OTP verification" },
  { name: "Binance", slug: "binance", category: "Crypto", from: "0.74", note: "Exchange SMS codes" },
] as const;

/** Customer-facing labels only — never name wholesale sites. */
export const SERVER_POOLS = [
  {
    id: "auto" as const,
    label: "Auto",
    title: "Best success first",
    blurb:
      "Ranks Primary, Backup, and Extra by OTP success quality; price only breaks ties.",
  },
  {
    id: 1 as const,
    label: "Server 1",
    title: "Primary",
    blurb: "Primary pool — pick when you want this server only.",
  },
  {
    id: 2 as const,
    label: "Server 2",
    title: "Backup",
    blurb: "Backup pool — pick when you want this server only.",
  },
  {
    id: 3 as const,
    label: "Server 3",
    title: "Extra",
    blurb: "Extra pool — competes in Auto by success quality, not last resort.",
  },
] as const;

export type ServerPoolId = (typeof SERVER_POOLS)[number]["id"];

export const MARKETPLACE_FACTS = [
  { label: "Countries", value: "200+", hint: "Full world list + search" },
  { label: "Services", value: "25+", hint: "Messaging → Crypto → Streaming" },
  { label: "OTP window", value: "20m+", hint: "Live inbox countdown" },
  { label: "Auto-refunds", value: "Yes", hint: "If SMS never lands" },
] as const;

export const HOW_IT_WORKS = [
  {
    n: "01",
    t: "Create an account",
    d: "Sign up with email and password. You need an account before you can buy a number or read OTP.",
  },
  {
    n: "02",
    t: "Add credit on WhatsApp",
    d: "Message us on WhatsApp from Deposit after you sign in. Tell us your account email and amount. Credit appears after we confirm.",
  },
  {
    n: "03",
    t: "Buy a number, copy the OTP",
    d: "Open Services, pick country and app, buy, then copy the code from your private inbox.",
  },
] as const;

export const PRODUCT_PILLARS = [
  {
    k: "01",
    title: "Global number catalog",
    body: "200+ countries, dozens of apps, three server pools — search stock and buy in a few taps.",
  },
  {
    k: "02",
    title: "Instant OTP inbox",
    body: "Codes land in a live panel with a countdown timer and one-click copy for phone + OTP.",
  },
  {
    k: "03",
    title: "Wallet & WhatsApp deposits",
    body: "Message us on WhatsApp after you sign in, spend credits only when a temp number is issued, and get refunds if SMS never arrives.",
  },
] as const;
