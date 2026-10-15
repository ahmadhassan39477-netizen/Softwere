/** Static catalog used when Neon has no seeded rows (no provider keys required). */

export const FALLBACK_COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸", dialCode: "+1", availability: 842, sortOrder: 0 },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44", availability: 512, sortOrder: 1 },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dialCode: "+234", availability: 1203, sortOrder: 2 },
  { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91", availability: 2100, sortOrder: 3 },
  { code: "DE", name: "Germany", flag: "🇩🇪", dialCode: "+49", availability: 390, sortOrder: 4 },
  { code: "FR", name: "France", flag: "🇫🇷", dialCode: "+33", availability: 280, sortOrder: 5 },
  { code: "BR", name: "Brazil", flag: "🇧🇷", dialCode: "+55", availability: 640, sortOrder: 6 },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dialCode: "+62", availability: 980, sortOrder: 7 },
  { code: "PH", name: "Philippines", flag: "🇵🇭", dialCode: "+63", availability: 710, sortOrder: 8 },
  { code: "RU", name: "Russia", flag: "🇷🇺", dialCode: "+7", availability: 1500, sortOrder: 9 },
] as const;

export const FALLBACK_SERVICES = [
  { slug: "whatsapp", name: "WhatsApp", category: "Messaging", base: 0.35 },
  { slug: "telegram", name: "Telegram", category: "Messaging", base: 0.28 },
  { slug: "google", name: "Google / Gmail", category: "Accounts", base: 0.42 },
  { slug: "openai", name: "OpenAI / ChatGPT", category: "AI", base: 0.55 },
  { slug: "tinder", name: "Tinder", category: "Dating", base: 0.48 },
  { slug: "binance", name: "Binance", category: "Crypto", base: 0.62 },
  { slug: "facebook", name: "Facebook", category: "Social", base: 0.3 },
  { slug: "tiktok", name: "TikTok", category: "Social", base: 0.38 },
  { slug: "discord", name: "Discord", category: "Messaging", base: 0.25 },
  { slug: "twitter", name: "Twitter / X", category: "Social", base: 0.4 },
  { slug: "instagram", name: "Instagram", category: "Social", base: 0.36 },
  { slug: "uber", name: "Uber", category: "Transport", base: 0.45 },
] as const;

export function filterFallbackCountries(q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return [...FALLBACK_COUNTRIES];
  return FALLBACK_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(needle) ||
      c.code.toLowerCase().includes(needle) ||
      c.dialCode.includes(needle),
  );
}
