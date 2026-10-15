/** Marketing + UI reference copy aligned with seed catalog (countries/services/pricing). */

export const CATALOG_SERVICES = [
  { name: "WhatsApp", slug: "whatsapp", category: "Messaging", from: "0.42", note: "Popular messaging OTP" },
  { name: "Telegram", slug: "telegram", category: "Messaging", from: "0.34", note: "Fast delivery pools" },
  { name: "Google / Gmail", slug: "google", category: "Accounts", from: "0.50", note: "Account verification" },
  { name: "OpenAI / ChatGPT", slug: "openai", category: "AI", from: "0.66", note: "Premium route" },
  { name: "Discord", slug: "discord", category: "Messaging", from: "0.30", note: "Community signups" },
  { name: "TikTok", slug: "tiktok", category: "Social", from: "0.46", note: "Creator & ads" },
  { name: "Instagram", slug: "instagram", category: "Social", from: "0.43", note: "Business & personal" },
  { name: "Binance", slug: "binance", category: "Crypto", from: "0.74", note: "Exchange SMS codes" },
] as const;

export const SERVER_POOLS = [
  {
    id: "auto" as const,
    label: "Auto",
    title: "Smart failover",
    blurb: "Tries Server 1 → 2 → 3 automatically until a number is issued.",
  },
  {
    id: 1 as const,
    label: "Server 1",
    title: "SMS-Activate",
    blurb: "Primary wholesale pool — best price when stock is available.",
  },
  {
    id: 2 as const,
    label: "Server 2",
    title: "5SIM",
    blurb: "Secondary pool. Used next when Server 1 has no numbers.",
  },
  {
    id: 3 as const,
    label: "Server 3",
    title: "Grizzly SMS",
    blurb: "Tertiary pool. Last resort in Auto mode.",
  },
] as const;

export type ServerPoolId = (typeof SERVER_POOLS)[number]["id"];

export const MARKETPLACE_FACTS = [
  { label: "Countries", value: "10+", hint: "US, UK, NG, IN…" },
  { label: "Services", value: "12+", hint: "Messaging → Crypto" },
  { label: "OTP window", value: "15m", hint: "Live inbox countdown" },
  { label: "Auto-refunds", value: "Yes", hint: "If SMS never lands" },
] as const;

export const HOW_IT_WORKS = [
  {
    n: "01",
    t: "Fund your wallet",
    d: "Add credits with crypto. Your balance updates before you buy a number.",
  },
  {
    n: "02",
    t: "Choose country & service",
    d: "Pick where the number should be from and which app you need the code for.",
  },
  {
    n: "03",
    t: "Receive & copy OTP",
    d: "Your temporary number and verification code appear in a live inbox — tap to copy.",
  },
] as const;

export const PRODUCT_PILLARS = [
  {
    k: "01",
    title: "Global number catalog",
    body: "Ten countries, twelve popular apps, three server pools — search stock and buy in a few taps.",
  },
  {
    k: "02",
    title: "Instant OTP inbox",
    body: "Codes land in a live panel with a countdown timer and one-click copy for phone + OTP.",
  },
  {
    k: "03",
    title: "Wallet & crypto deposits",
    body: "Pay with crypto, spend credits only when a number is issued, and get refunds if SMS never arrives.",
  },
] as const;
