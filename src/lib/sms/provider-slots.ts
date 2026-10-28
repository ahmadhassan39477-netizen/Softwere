import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProviderKey } from "./types";
import { isSmsManDocsUrl } from "./adapters/sms-man";

/** Admin Server 1/2/3 slot keys. */
export const SLOT_KEYS = ["server-1", "server-2", "server-3"] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

export type SlotProviderType =
  | "sms-activate"
  | "5sim"
  | "grizzlysms"
  | "sms-man"
  | "smsbower"
  | "custom-sa";

/** Uniform retail markup for every server: retail = wholesale × 1.20 */
export const DEFAULT_SLOT_MARKUP = 20;

/** @deprecated Use DEFAULT_SLOT_MARKUP — all providers use 20%. */
export const GRIZZLY_DEFAULT_MARKUP = DEFAULT_SLOT_MARKUP;

export const PROVIDER_TYPE_OPTIONS: {
  value: SlotProviderType;
  label: string;
  defaultMarkup: number;
}[] = [
  { value: "sms-activate", label: "SMS-Activate", defaultMarkup: DEFAULT_SLOT_MARKUP },
  { value: "5sim", label: "5SIM", defaultMarkup: DEFAULT_SLOT_MARKUP },
  { value: "grizzlysms", label: "Grizzly SMS", defaultMarkup: DEFAULT_SLOT_MARKUP },
  { value: "smsbower", label: "SMSBower", defaultMarkup: DEFAULT_SLOT_MARKUP },
  { value: "sms-man", label: "SMS-Man", defaultMarkup: DEFAULT_SLOT_MARKUP },
  { value: "custom-sa", label: "Custom (SMS-Activate API)", defaultMarkup: DEFAULT_SLOT_MARKUP },
];

/** Desired Admin defaults: S1=5SIM, S2=Grizzly, S3=SMSBower (Extra). */
export const SLOT_TYPE_DEFAULTS: Record<1 | 2 | 3, SlotProviderType> = {
  1: "5sim",
  2: "grizzlysms",
  3: "smsbower",
};

/** One-time S3 → SMSBower flip (preserves real tokens; clears wrong-type keys). */
const DEFAULTS_FLAG = "sms_slots_defaults_v5";

export function slotKeyForServer(server: 1 | 2 | 3): SlotKey {
  return `server-${server}` as SlotKey;
}

export function serverFromSlotKey(key: string): 1 | 2 | 3 | null {
  if (key === "server-1") return 1;
  if (key === "server-2") return 2;
  if (key === "server-3") return 3;
  return null;
}

export function defaultMarkupForType(_type?: SlotProviderType): number {
  return DEFAULT_SLOT_MARKUP;
}

export function displayNameForType(type: SlotProviderType): string {
  return PROVIDER_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function isSlotProviderType(v: string): v is SlotProviderType {
  return PROVIDER_TYPE_OPTIONS.some((o) => o.value === v);
}

/** Map provider type → ProviderKey stored on orders (custom-sa → sms-activate compatible key). */
export function providerKeyForType(type: SlotProviderType): ProviderKey {
  if (type === "custom-sa") return "sms-activate";
  return type as ProviderKey;
}

export function envKeyForType(type: SlotProviderType): string | undefined {
  if (type === "sms-activate" || type === "custom-sa") {
    return process.env.SMS_ACTIVATE_API_KEY?.trim();
  }
  if (type === "5sim") return process.env.FIVESIM_API_KEY?.trim();
  if (type === "grizzlysms") {
    return (
      process.env.GRIZZLY_SMS_API_KEY?.trim() ||
      process.env.GRIZZLYSMS_API_KEY?.trim()
    );
  }
  if (type === "smsbower") {
    const t = process.env.SMSBOWER_API_KEY?.trim();
    // Never treat a chat-masked fragment (literal *) as a usable key
    if (t && t.includes("*")) return undefined;
    return t;
  }
  if (type === "sms-man") {
    const t = process.env.SMS_MAN_API_KEY?.trim() || process.env.SMSMAN_API_KEY?.trim();
    if (t && isSmsManDocsUrl(t)) return undefined;
    return t;
  }
  return undefined;
}

export function defaultBaseUrlForType(type: SlotProviderType): string | null {
  if (type === "sms-activate") {
    return (
      process.env.SMS_ACTIVATE_BASE_URL?.trim() ||
      "https://api.sms-activate.org/stubs/handler_api.php"
    );
  }
  if (type === "grizzlysms") {
    return (
      process.env.GRIZZLY_SMS_BASE_URL?.trim() ||
      "https://api.grizzlysms.com/stubs/handler_api.php"
    );
  }
  if (type === "smsbower") {
    return (
      process.env.SMSBOWER_BASE_URL?.trim() ||
      "https://smsbower.page/stubs/handler_api.php"
    );
  }
  if (type === "sms-man") {
    return "https://api.sms-man.com/control/";
  }
  if (type === "custom-sa") return null;
  return null;
}

/** True when the stored “key” is a docs/control URL or HTTP junk, not a token. */
export function looksLikeApiDocsUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const t = value.trim();
  if (isSmsManDocsUrl(t)) return true;
  if (/^https?:\/\//i.test(t)) return true;
  // Curl / “GET https://…” / product-balance / guest products pasted as the key
  if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|CURL)\b/i.test(t)) return true;
  if (/\bhttps?:\/\//i.test(t)) return true;
  if (
    /5sim\.net|grizzlysms\.com|sms-man\.com|sms-activate\.|smsbower\./i.test(t) &&
    /[/?]/.test(t)
  ) {
    return true;
  }
  if (/product-balance|\/v1\/(user|guest)\//i.test(t)) return true;
  return false;
}

/** Sanitize Admin-pasted keys: never persist docs URLs or HTTP request lines as tokens. */
export function sanitizeApiKeyForType(
  type: SlotProviderType,
  apiKey: string | null | undefined,
): string | null {
  if (apiKey == null) return null;
  const trimmed = apiKey.trim();
  if (!trimmed) return null;
  if (type === "sms-man" && isSmsManDocsUrl(trimmed)) return null;
  // Chat-masked fragments (literal *) are never usable tokens
  if (trimmed.includes("*")) return null;
  if (looksLikeApiDocsUrl(trimmed) && type !== "custom-sa") return null;
  // Real tokens are not sentences / request lines
  if (/\s/.test(trimmed) && type !== "custom-sa") return null;
  return trimmed;
}

/** Legacy provider-key rows → which slot to seed from (keys only). */
const LEGACY_KEY_SOURCES: { oldKey: string; slot: 1 | 2 | 3 }[] = [
  { oldKey: "5sim", slot: 1 },
  { oldKey: "sms-activate", slot: 1 },
  { oldKey: "grizzlysms", slot: 2 },
  { oldKey: "smsbower", slot: 3 },
  { oldKey: "sms-man", slot: 3 },
];

/**
 * Ensure server-1/2/3 slots exist.
 * Defaults: S1=5SIM, S2=Grizzly, S3=SMSBower; all margins 20%.
 * Preserves real API keys; clears mistaken docs URLs / wrong-type tokens.
 */
export async function ensureProviderSlots(): Promise<void> {
  const markupDefault = Number(process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? DEFAULT_SLOT_MARKUP);

  for (const slot of [1, 2, 3] as const) {
    const slotKey = slotKeyForServer(slot);
    const existingSlot = await prisma.providerSetting.findUnique({ where: { key: slotKey } });
    const type = SLOT_TYPE_DEFAULTS[slot];

    if (!existingSlot) {
      let apiKey: string | null = null;
      if (type === "5sim") {
        const row = await prisma.providerSetting.findUnique({ where: { key: "5sim" } });
        apiKey = row?.apiKey ?? null;
      } else if (type === "grizzlysms") {
        const row = await prisma.providerSetting.findUnique({ where: { key: "grizzlysms" } });
        apiKey = row?.apiKey ?? null;
      } else if (type === "sms-activate") {
        const row = await prisma.providerSetting.findUnique({ where: { key: "sms-activate" } });
        apiKey = row?.apiKey ?? null;
      } else if (type === "smsbower") {
        const row = await prisma.providerSetting.findUnique({ where: { key: "smsbower" } });
        apiKey = sanitizeApiKeyForType("smsbower", row?.apiKey);
      } else if (type === "sms-man") {
        const row = await prisma.providerSetting.findUnique({ where: { key: "sms-man" } });
        apiKey = sanitizeApiKeyForType("sms-man", row?.apiKey);
      }

      await prisma.providerSetting.create({
        data: {
          key: slotKey,
          name: `Server ${slot}`,
          providerType: type,
          baseUrl: null,
          apiKey,
          enabled: Boolean(apiKey) || slot !== 3,
          priority: slot,
          markupPercent: new Prisma.Decimal(markupDefault || DEFAULT_SLOT_MARKUP),
        },
      });
    }
  }

  // One-time apply of v5 defaults (S3=SMSBower + 20%) without wiping real SMSBower tokens
  const flag = await prisma.setting.findUnique({ where: { key: DEFAULTS_FLAG } });
  if (!flag || flag.value !== "1") {
    // Before flipping S3 type, move a real Grizzly key from S3 → S2 if S2 empty
    const s3Before = await prisma.providerSetting.findUnique({ where: { key: "server-3" } });
    const s2Before = await prisma.providerSetting.findUnique({ where: { key: "server-2" } });
    if (
      s3Before &&
      s2Before &&
      s3Before.providerType === "grizzlysms" &&
      s3Before.apiKey?.trim() &&
      !looksLikeApiDocsUrl(s3Before.apiKey) &&
      !s2Before.apiKey?.trim()
    ) {
      await prisma.providerSetting.update({
        where: { key: "server-2" },
        data: {
          apiKey: s3Before.apiKey,
          providerType: "grizzlysms",
        },
      });
    }

    for (const slot of [1, 2, 3] as const) {
      const slotKey = slotKeyForServer(slot);
      const row = await prisma.providerSetting.findUnique({ where: { key: slotKey } });
      if (!row) continue;
      const nextType = SLOT_TYPE_DEFAULTS[slot];
      let nextKey = row.apiKey;
      // Clear docs URLs / masked fragments
      if (looksLikeApiDocsUrl(nextKey) || nextKey?.includes("*")) {
        nextKey = null;
      }
      // Wrong-type keys must not ride along when flipping S3 onto SMSBower
      if (
        nextType === "smsbower" &&
        row.providerType !== "smsbower" &&
        row.providerType !== "custom-sa" &&
        nextKey?.trim()
      ) {
        // Keep only if already a genuine SMSBower legacy row key; else clear
        nextKey = null;
      }
      const patch: {
        providerType: SlotProviderType;
        name: string;
        markupPercent: Prisma.Decimal;
        apiKey?: string | null;
        enabled?: boolean;
      } = {
        providerType: nextType,
        name: `Server ${slot}`,
        markupPercent: new Prisma.Decimal(DEFAULT_SLOT_MARKUP),
      };
      if (nextKey !== row.apiKey) patch.apiKey = nextKey;
      // Never force-enable Server 3 without an SMSBower token
      if (nextType === "smsbower" && !nextKey?.trim()) {
        // leave enabled as-is
      }
      await prisma.providerSetting.update({
        where: { key: slotKey },
        data: patch,
      });
    }

    // Prefer 5SIM legacy key on S1 when empty
    const s1 = await prisma.providerSetting.findUnique({ where: { key: "server-1" } });
    const legacy5 = await prisma.providerSetting.findUnique({ where: { key: "5sim" } });
    if (s1 && !s1.apiKey?.trim() && legacy5?.apiKey?.trim()) {
      await prisma.providerSetting.update({
        where: { key: "server-1" },
        data: { apiKey: legacy5.apiKey },
      });
    }

    // Prefer Grizzly legacy key on S2 when empty
    const s2 = await prisma.providerSetting.findUnique({ where: { key: "server-2" } });
    const legacyG = await prisma.providerSetting.findUnique({ where: { key: "grizzlysms" } });
    if (s2 && !s2.apiKey?.trim() && legacyG?.apiKey?.trim()) {
      await prisma.providerSetting.update({
        where: { key: "server-2" },
        data: { apiKey: legacyG.apiKey, providerType: "grizzlysms" },
      });
    }

    // Prefer SMSBower legacy ProviderSetting / ProviderConfig on S3 when empty
    const s3 = await prisma.providerSetting.findUnique({ where: { key: "server-3" } });
    const legacyB = await prisma.providerSetting.findUnique({ where: { key: "smsbower" } });
    const bowerKey = sanitizeApiKeyForType("smsbower", legacyB?.apiKey);
    if (s3 && !s3.apiKey?.trim() && bowerKey) {
      await prisma.providerSetting.update({
        where: { key: "server-3" },
        data: { apiKey: bowerKey, providerType: "smsbower", enabled: true },
      });
    } else if (s3 && !s3.apiKey?.trim()) {
      try {
        const cfg = await prisma.providerConfig.findUnique({ where: { key: "smsbower" } });
        const fromCfg = sanitizeApiKeyForType("smsbower", cfg?.apiKey);
        if (fromCfg) {
          await prisma.providerSetting.update({
            where: { key: "server-3" },
            data: { apiKey: fromCfg, providerType: "smsbower", enabled: true },
          });
        }
      } catch {
        /* ignore */
      }
    }

    await prisma.setting.upsert({
      where: { key: DEFAULTS_FLAG },
      create: { key: DEFAULTS_FLAG, value: "1" },
      update: { value: "1" },
    });
  } else {
    // Lightweight hygiene on every request (must stay cheap — /services calls this).
    // Strip URL junk, force 20%, and keep a *valid on-row key* Enabled.
    // Do NOT call resolveSlotApiKey here (extra DB + writes) — recovery stays in loadProviderSlots.
    for (const slot of [1, 2, 3] as const) {
      const slotKey = slotKeyForServer(slot);
      const row = await prisma.providerSetting.findUnique({ where: { key: slotKey } });
      if (!row) continue;
      const type: SlotProviderType = isSlotProviderType(row.providerType)
        ? row.providerType
        : SLOT_TYPE_DEFAULTS[slot];
      const patch: {
        markupPercent?: Prisma.Decimal;
        apiKey?: string | null;
        enabled?: boolean;
      } = {};
      if (Number(row.markupPercent) === 40) {
        patch.markupPercent = new Prisma.Decimal(DEFAULT_SLOT_MARKUP);
      }
      if (looksLikeApiDocsUrl(row.apiKey)) {
        // Clear GET/https/product-balance pastes (e.g. 5SIM URL mistaken for token)
        patch.apiKey = null;
      }
      const keyAfter = sanitizeApiKeyForType(
        type,
        patch.apiKey !== undefined ? patch.apiKey : row.apiKey,
      );
      // Valid key on file must stay buyable — Enable was reverting / one-time flags burned
      if (keyAfter && !row.enabled) {
        patch.enabled = true;
      }
      if (Object.keys(patch).length > 0) {
        await prisma.providerSetting.update({ where: { key: slotKey }, data: patch });
      }
    }
  }

  void LEGACY_KEY_SOURCES;
}

export type SlotRow = {
  key: SlotKey;
  name: string;
  providerType: SlotProviderType;
  baseUrl: string | null;
  apiKey: string | null;
  enabled: boolean;
  priority: number;
  markupPercent: number;
};

/** Legacy ProviderSetting / ProviderConfig keys that often still hold the real token. */
function legacySettingKeysForType(type: SlotProviderType): string[] {
  if (type === "5sim") return ["5sim"];
  if (type === "grizzlysms") return ["grizzlysms"];
  if (type === "smsbower") return ["smsbower"];
  if (type === "sms-man") return ["sms-man"];
  if (type === "sms-activate" || type === "custom-sa") return ["sms-activate"];
  return [];
}

/**
 * Resolve a usable API key for a slot: Admin slot → legacy ProviderSetting →
 * ProviderConfig → env. Never logs the key. Optionally writes a recovered key
 * back onto server-N so Enable alone cannot leave buy with an empty slot.
 */
export async function resolveSlotApiKey(
  type: SlotProviderType,
  slotKey: SlotKey,
  rawSlotKey: string | null | undefined,
): Promise<string | null> {
  const fromSlot = sanitizeApiKeyForType(type, rawSlotKey);
  if (fromSlot) return fromSlot;

  for (const legacyKey of legacySettingKeysForType(type)) {
    try {
      const legacy = await prisma.providerSetting.findUnique({
        where: { key: legacyKey },
      });
      const recovered = sanitizeApiKeyForType(type, legacy?.apiKey);
      if (recovered) {
        await prisma.providerSetting
          .update({
            where: { key: slotKey },
            data: { apiKey: recovered },
          })
          .catch(() => undefined);
        return recovered;
      }
    } catch {
      /* ignore */
    }
  }

  try {
    const configKey = type === "custom-sa" ? "sms-activate" : type;
    const cfg = await prisma.providerConfig.findUnique({ where: { key: configKey } });
    const recovered = sanitizeApiKeyForType(type, cfg?.apiKey);
    if (recovered) {
      await prisma.providerSetting
        .update({
          where: { key: slotKey },
          data: { apiKey: recovered },
        })
        .catch(() => undefined);
      return recovered;
    }
  } catch {
    /* ignore */
  }

  // Never treat Vercel/env keys as the Admin slot key — buy must use the key she
  // Save-key'd (same wallet she topped up). Env leftovers caused false "buy ready".
  return null;
}

export async function loadProviderSlots(): Promise<SlotRow[]> {
  await ensureProviderSlots().catch(() => undefined);
  const rows = await prisma.providerSetting.findMany({
    where: { key: { in: [...SLOT_KEYS] } },
    orderBy: { priority: "asc" },
  });

  const out: SlotRow[] = [];
  for (const slot of [1, 2, 3] as const) {
    const key = slotKeyForServer(slot);
    const row = rows.find((r) => r.key === key);
    const type: SlotProviderType =
      row && isSlotProviderType(row.providerType)
        ? row.providerType
        : SLOT_TYPE_DEFAULTS[slot];
    const apiKey = await resolveSlotApiKey(type, key, row?.apiKey ?? null);
    out.push({
      key,
      name: row?.name ?? `Server ${slot}`,
      providerType: type,
      baseUrl: row?.baseUrl ?? null,
      apiKey,
      enabled: row?.enabled ?? true,
      priority: slot,
      markupPercent: Number(row?.markupPercent ?? DEFAULT_SLOT_MARKUP),
    });
  }
  return out;
}

/** Markup % for a server slot (all servers default 20%). */
export async function markupForServer(server: 1 | 2 | 3): Promise<number> {
  const slots = await loadProviderSlots();
  const slot = slots.find((s) => s.priority === server);
  if (!slot) return DEFAULT_SLOT_MARKUP;
  return slot.markupPercent > 0 ? slot.markupPercent : DEFAULT_SLOT_MARKUP;
}

export function retailFromWholesale(wholesale: number, markupPercent: number): number {
  return Number((wholesale * (1 + markupPercent / 100)).toFixed(4));
}
