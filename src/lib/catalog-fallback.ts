/** Static catalog used when Neon has no seeded rows (no provider keys required). */
import { WORLD_COUNTRIES, filterWorldCountries } from "@/lib/world-countries";

/** @deprecated Prefer WORLD_COUNTRIES — kept as alias so older imports keep working. */
export const FALLBACK_COUNTRIES = WORLD_COUNTRIES;

/** Broad service list for /services — never shrink to a handful. */
export const FALLBACK_SERVICES = [
  { slug: "whatsapp", name: "WhatsApp", category: "Messaging", base: 0.35 },
  { slug: "telegram", name: "Telegram", category: "Messaging", base: 0.28 },
  { slug: "google", name: "Google / Gmail", category: "Accounts", base: 0.42 },
  { slug: "microsoft", name: "Microsoft", category: "Accounts", base: 0.4 },
  { slug: "hotmail", name: "Hotmail / Outlook", category: "Accounts", base: 0.38 },
  { slug: "openai", name: "OpenAI / ChatGPT", category: "AI", base: 0.55 },
  { slug: "amazon", name: "Amazon", category: "Shopping", base: 0.38 },
  { slug: "ebay", name: "eBay", category: "Shopping", base: 0.4 },
  { slug: "instagram", name: "Instagram", category: "Social", base: 0.36 },
  { slug: "facebook", name: "Facebook", category: "Social", base: 0.3 },
  { slug: "twitter", name: "Twitter / X", category: "Social", base: 0.4 },
  { slug: "tiktok", name: "TikTok", category: "Social", base: 0.38 },
  { slug: "snapchat", name: "Snapchat", category: "Social", base: 0.34 },
  { slug: "linkedin", name: "LinkedIn", category: "Social", base: 0.45 },
  { slug: "discord", name: "Discord", category: "Messaging", base: 0.25 },
  { slug: "tinder", name: "Tinder", category: "Dating", base: 0.48 },
  { slug: "binance", name: "Binance", category: "Crypto", base: 0.62 },
  { slug: "uber", name: "Uber", category: "Transport", base: 0.45 },
  { slug: "apple", name: "Apple ID", category: "Accounts", base: 0.5 },
  { slug: "yahoo", name: "Yahoo", category: "Accounts", base: 0.32 },
  { slug: "viber", name: "Viber", category: "Messaging", base: 0.28 },
  { slug: "signal", name: "Signal", category: "Messaging", base: 0.3 },
  { slug: "netflix", name: "Netflix", category: "Streaming", base: 0.52 },
  { slug: "paypal", name: "PayPal", category: "Finance", base: 0.58 },
  { slug: "spotify", name: "Spotify", category: "Streaming", base: 0.36 },
  { slug: "steam", name: "Steam", category: "Gaming", base: 0.44 },
  { slug: "kakao", name: "KakaoTalk", category: "Messaging", base: 0.4 },
  { slug: "line", name: "LINE", category: "Messaging", base: 0.38 },
  { slug: "wechat", name: "WeChat", category: "Messaging", base: 0.42 },
] as const;

export function filterFallbackCountries(q: string) {
  return filterWorldCountries(q);
}
