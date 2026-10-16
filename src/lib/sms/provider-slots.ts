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
  { value: "sms-man", label: "SMS-Man", defaultMarkup: DEFAULT_SLOT_MARKUP },
  { value: "custom-sa", label: "Custom (SMS-Activate API)", defaultMarkup: DEFAULT_SLOT_MARKUP },
];

/** Desired Admin defaults: S1=5SIM, S2=Grizzly, S3=SMS-Man. */
export const SLOT_TYPE_DEFAULTS: Record<1 | 2 | 3, SlotProviderType> = {
  1: "5sim",
  2: "grizzlysms",
  3: "sms-man",
};

const DEFAULTS_FLAG = "sms_slots_defaults_v4";

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
  if (type === "sms-man") {
    return "https://api.sms-man.com/control/";
  }
  if (type === "custom-sa") return null;
  return null;
}

/** True when the stored “key” is a docs/control URL, not a token. */
export function looksLikeApiDocsUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return isSmsManDocsUrl(value) || /^https?:\/\//i.test(value.trim());
}

/** Sanitize Admin-pasted keys: never persist get-sms docs URLs as tokens. */
export function sanitizeApiKeyForType(
  type: SlotProviderType,
  apiKey: string | null | undefined,
): string | null {
  if (apiKey == null) return null;
  const trimmed = apiKey.trim();
  if (!trimmed) return null;
  if (type === "sms-man" && isSmsManDocsUrl(trimmed)) return null;
  if (looksLikeApiDocsUrl(trimmed) && type !== "custom-sa") return null;
  return trimmed;
}

/** Legacy provider-key rows → which slot to seed from (keys only). */
const LEGACY_KEY_SOURCES: { oldKey: string; slot: 1 | 2 | 3 }[] = [
  { oldKey: "5sim", slot: 1 },
  { oldKey: "sms-activate", slot: 1 },
  { oldKey: "grizzlysms", slot: 2 },
  { oldKey: "sms-man", slot: 3 },
];

/**
 * Ensure server-1/2/3 slots exist.
 * Defaults: S1=5SIM, S2=Grizzly, S3=SMS-Man; all margins 20%.
 * Preserves real API keys; clears mistaken docs URLs on SMS-Man.
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
          enabled: true,
          priority: slot,
          markupPercent: new Prisma.Decimal(markupDefault || DEFAULT_SLOT_MARKUP),
        },
      });
    }
  }

  // One-time apply of v4 defaults (S3=SMS-Man + 20%) without wiping real tokens
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
      // Clear docs URLs mistakenly stored as SMS-Man (or any) tokens
      if (nextType === "sms-man" && looksLikeApiDocsUrl(nextKey)) {
        nextKey = null;
      }
      // Do not keep a Grizzly key on the SMS-Man slot after the type flip
      if (
        nextType === "sms-man" &&
        row.providerType === "grizzlysms" &&
        nextKey?.trim()
      ) {
        nextKey = null;
      }
      // Do not force-enable Server 3 without an SMS-Man token
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
      if (nextType === "sms-man" && !nextKey?.trim()) {
        // leave enabled as-is (user may have Disabled); never flip on without token
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

    // Prefer SMS-Man legacy key on S3 when empty (never a docs URL)
    const s3 = await prisma.providerSetting.findUnique({ where: { key: "server-3" } });
    const legacyM = await prisma.providerSetting.findUnique({ where: { key: "sms-man" } });
    const manKey = sanitizeApiKeyForType("sms-man", legacyM?.apiKey);
    if (s3 && !s3.apiKey?.trim() && manKey) {
      await prisma.providerSetting.update({
        where: { key: "server-3" },
        data: { apiKey: manKey },
      });
    }

    await prisma.setting.upsert({
      where: { key: DEFAULTS_FLAG },
      create: { key: DEFAULTS_FLAG, value: "1" },
      update: { value: "1" },
    });
  } else {
    // Ongoing hygiene: strip docs URLs, force 20% if stuck at 40
    for (const slot of [1, 2, 3] as const) {
      const slotKey = slotKeyForServer(slot);
      const row = await prisma.providerSetting.findUnique({ where: { key: slotKey } });
      if (!row) continue;
      const patch: { markupPercent?: Prisma.Decimal; apiKey?: string | null } = {};
      if (Number(row.markupPercent) === 40) {
        patch.markupPercent = new Prisma.Decimal(DEFAULT_SLOT_MARKUP);
      }
      if (
        (row.providerType === "sms-man" || looksLikeApiDocsUrl(row.apiKey)) &&
        looksLikeApiDocsUrl(row.apiKey)
      ) {
        patch.apiKey = null;
      }
      if (Object.keys(patch).length > 0) {
        await prisma.providerSetting.update({ where: { key: slotKey }, data: patch });
      }
    }

    // Keep S2 Grizzly keyed from legacy row when empty (S3 is SMS-Man — do not copy)
    const s2 = await prisma.providerSetting.findUnique({ where: { key: "server-2" } });
    const legacyG = await prisma.providerSetting.findUnique({ where: { key: "grizzlysms" } });
    if (
      s2 &&
      s2.providerType === "grizzlysms" &&
      !s2.apiKey?.trim() &&
      legacyG?.apiKey?.trim()
    ) {
      await prisma.providerSetting.update({
        where: { key: "server-2" },
        data: { apiKey: legacyG.apiKey },
      });
    }
  }

  // One-time: Server 2 had a saved Grizzly key but stayed Disabled → liveRows=0 and
  // Backup kept fake seed while Primary showed live 5SIM (looked like prices "went up").
  const reenableFlag = "sms_reenable_keyed_grizzly_s2_v1";
  const reenableDone = await prisma.setting.findUnique({ where: { key: reenableFlag } });
  if (!reenableDone || reenableDone.value !== "1") {
    const s2 = await prisma.providerSetting.findUnique({ where: { key: "server-2" } });
    if (
      s2 &&
      s2.providerType === "grizzlysms" &&
      Boolean(s2.apiKey?.trim()) &&
      !s2.enabled
    ) {
      await prisma.providerSetting.update({
        where: { key: "server-2" },
        data: { enabled: true, markupPercent: new Prisma.Decimal(DEFAULT_SLOT_MARKUP) },
      });
    }
    await prisma.setting.upsert({
      where: { key: reenableFlag },
      create: { key: reenableFlag, value: "1" },
      update: { value: "1" },
    });
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
    const rawKey = row?.apiKey ?? null;
    const apiKey =
      type === "sms-man" ? sanitizeApiKeyForType("sms-man", rawKey) : rawKey;
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
