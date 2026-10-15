/** Shared service/country codes across SMS-Activate-compatible APIs and 5SIM. */

export const SA_SERVICE: Record<string, string> = {
  whatsapp: "wa",
  telegram: "tg",
  google: "go",
  openai: "dr",
  tinder: "oi",
  binance: "hw",
  facebook: "fb",
  tiktok: "lf",
  discord: "ds",
  twitter: "tw",
  instagram: "ig",
  uber: "ub",
};

export const SA_COUNTRY: Record<string, string> = {
  US: "12",
  GB: "16",
  NG: "19",
  IN: "22",
  DE: "43",
  FR: "78",
  BR: "73",
  ID: "6",
  PH: "4",
  RU: "0",
};

export const FIVESIM_PRODUCT: Record<string, string> = {
  whatsapp: "whatsapp",
  telegram: "telegram",
  google: "google",
  openai: "openai",
  tinder: "tinder",
  binance: "binance",
  facebook: "facebook",
  tiktok: "tiktok",
  discord: "discord",
  twitter: "twitter",
  instagram: "instagram",
  uber: "uber",
};

export const FIVESIM_COUNTRY: Record<string, string> = {
  US: "usa",
  GB: "england",
  NG: "nigeria",
  IN: "india",
  DE: "germany",
  FR: "france",
  BR: "brazil",
  ID: "indonesia",
  PH: "philippines",
  RU: "russia",
};

export function maskKey(key: string | null | undefined): string {
  if (!key) return "(not set)";
  if (key.length < 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
