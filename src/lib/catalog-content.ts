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
    id: 1,
    label: "Server 1",
    title: "Standard",
    blurb: "Best price. Shared wholesale capacity — solid for most apps.",
  },
  {
    id: 2,
    label: "Server 2",
    title: "Balanced",
    blurb: "~8% above standard. Higher success on busy services.",
  },
  {
    id: 3,
    label: "Server 3",
    title: "Priority",
    blurb: "Premium pool. Prefer when Standard shows low stock.",
  },
] as const;

export const MARKETPLACE_FACTS = [
  { label: "Countries", value: "10+", hint: "US, UK, NG, IN…" },
  { label: "Services", value: "12+", hint: "Messaging → Crypto" },
  { label: "OTP window", value: "20m", hint: "Live inbox countdown" },
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
