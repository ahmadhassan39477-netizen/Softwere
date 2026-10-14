/** Marketing + UI reference copy aligned with seed catalog (countries/services/pricing). */

export const CATALOG_SERVICES = [
  { name: "WhatsApp", category: "Messaging", from: "0.42", note: "High volume · 20 min TTL" },
  { name: "Telegram", category: "Messaging", from: "0.34", note: "Fast delivery pools" },
  { name: "Google / Gmail", category: "Accounts", from: "0.50", note: "Account verification" },
  { name: "OpenAI / ChatGPT", category: "AI", from: "0.66", note: "Premium route" },
  { name: "Discord", category: "Messaging", from: "0.30", note: "Community signups" },
  { name: "TikTok", category: "Social", from: "0.46", note: "Creator & ads" },
  { name: "Instagram", category: "Social", from: "0.43", note: "Business & personal" },
  { name: "Binance", category: "Crypto", from: "0.74", note: "Exchange KYC SMS" },
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
  { label: "Countries", value: "10", hint: "US, UK, NG, IN…" },
  { label: "Services", value: "12", hint: "Messaging → Crypto" },
  { label: "OTP window", value: "20m", hint: "Auto-refund if empty" },
  { label: "Cancel", value: "2m", hint: "Full credit return" },
] as const;

export const HOW_IT_WORKS = [
  {
    n: "01",
    t: "Fund your wallet",
    d: "Deposit via crypto webhook or manual review. Balances settle to four decimals before you buy.",
  },
  {
    n: "02",
    t: "Choose country & service",
    d: "Filter routes by stock, then pick Server 1–3. Price = provider cost × your markup.",
  },
  {
    n: "03",
    t: "Receive & copy OTP",
    d: "Live panel streams SMS over SSE (polling fallback). Codes auto-copy; unused numbers refund.",
  },
] as const;

export const PRODUCT_PILLARS = [
  {
    k: "01",
    title: "Global OTP catalog",
    body: "Ten countries, twelve services, three server pools — searchable stock with live availability counts.",
  },
  {
    k: "02",
    title: "Realtime inbox",
    body: "Server-sent events with polling fallback, countdown timers, and one-click copy for phone + OTP.",
  },
  {
    k: "03",
    title: "Wallet & reseller API",
    body: "Transactional credits, signed deposit webhooks, and REST keys for automated purchase flows.",
  },
] as const;
