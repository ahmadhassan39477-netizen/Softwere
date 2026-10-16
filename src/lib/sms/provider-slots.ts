import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProviderKey } from "./types";

/** Admin Server 1/2/3 slot keys. */
export const SLOT_KEYS = ["server-1", "server-2", "server-3"] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

export type SlotProviderType = "sms-activate" | "5sim" | "grizzlysms" | "custom-sa";

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
  { value: "custom-sa", label: "Custom (SMS-Activate API)", defaultMarkup: DEFAULT_SLOT_MARKUP },
];

/** Desired Admin defaults: S1=5SIM, S2=Grizzly, S3=Grizzly. */
export const SLOT_TYPE_DEFAULTS: Record<1 | 2 | 3, SlotProviderType> = {
  1: "5sim",
  2: "grizzlysms",
  3: "grizzlysms",
};

const DEFAULTS_FLAG = "sms_slots_defaults_v3";

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
  if (type === "grizzlysms") return process.env.GRIZZLY_SMS_API_KEY?.trim();
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
  if (type === "custom-sa") return null;
  return null;
}

/** Legacy provider-key rows → which slot to seed from (keys only). */
const LEGACY_KEY_SOURCES: { oldKey: string; slot: 1 | 2 | 3 }[] = [
  { oldKey: "5sim", slot: 1 },
  { oldKey: "sms-activate", slot: 1 },
  { oldKey: "grizzlysms", slot: 3 },
  { oldKey: "5sim", slot: 2 },
];

/**
 * Ensure server-1/2/3 slots exist.
 * Defaults: S1=5SIM, S2=Grizzly, S3=Grizzly; all margins 20%.
 * Preserves existing API keys (S3 Grizzly key kept; copied to S2 when S2 empty).
 */
export async function ensureProviderSlots(): Promise<void> {
  const markupDefault = Number(process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? DEFAULT_SLOT_MARKUP);

  for (const slot of [1, 2, 3] as const) {
    const slotKey = slotKeyForServer(slot);
    const existingSlot = await prisma.providerSetting.findUnique({ where: { key: slotKey } });
    const type = SLOT_TYPE_DEFAULTS[slot];

    if (!existingSlot) {
      // Prefer matching legacy key for this slot's provider type
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

  // One-time apply of v3 defaults (types + 20% for all) without wiping keys
  const flag = await prisma.setting.findUnique({ where: { key: DEFAULTS_FLAG } });
  if (!flag || flag.value !== "1") {
    for (const slot of [1, 2, 3] as const) {
      const slotKey = slotKeyForServer(slot);
      const row = await prisma.providerSetting.findUnique({ where: { key: slotKey } });
      if (!row) continue;
      await prisma.providerSetting.update({
        where: { key: slotKey },
        data: {
          providerType: SLOT_TYPE_DEFAULTS[slot],
          name: `Server ${slot}`,
          markupPercent: new Prisma.Decimal(DEFAULT_SLOT_MARKUP),
        },
      });
    }

    // Preserve / restore Grizzly key onto S3 from legacy row if S3 empty
    const s3 = await prisma.providerSetting.findUnique({ where: { key: "server-3" } });
    const legacyG = await prisma.providerSetting.findUnique({ where: { key: "grizzlysms" } });
    if (s3 && !s3.apiKey?.trim() && legacyG?.apiKey?.trim()) {
      await prisma.providerSetting.update({
        where: { key: "server-3" },
        data: { apiKey: legacyG.apiKey },
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

    // Copy S3 Grizzly key → S2 when S2 empty
    const s2 = await prisma.providerSetting.findUnique({ where: { key: "server-2" } });
    const s3b = await prisma.providerSetting.findUnique({ where: { key: "server-3" } });
    if (s2 && s3b && !s2.apiKey?.trim() && s3b.apiKey?.trim()) {
      await prisma.providerSetting.update({
        where: { key: "server-2" },
        data: { apiKey: s3b.apiKey },
      });
    }

    await prisma.setting.upsert({
      where: { key: DEFAULTS_FLAG },
      create: { key: DEFAULTS_FLAG, value: "1" },
      update: { value: "1" },
    });
  } else {
    // One-time override leftover Grizzly 40% → 20%
    for (const slot of [1, 2, 3] as const) {
      const slotKey = slotKeyForServer(slot);
      const row = await prisma.providerSetting.findUnique({ where: { key: slotKey } });
      if (row && Number(row.markupPercent) === 40) {
        await prisma.providerSetting.update({
          where: { key: slotKey },
          data: { markupPercent: new Prisma.Decimal(DEFAULT_SLOT_MARKUP) },
        });
      }
    }

    // Keep S2 keyed from S3 Grizzly when empty
    const s2 = await prisma.providerSetting.findUnique({ where: { key: "server-2" } });
    const s3 = await prisma.providerSetting.findUnique({ where: { key: "server-3" } });
    if (
      s2 &&
      s3 &&
      s2.providerType === "grizzlysms" &&
      s3.providerType === "grizzlysms" &&
      !s2.apiKey?.trim() &&
      s3.apiKey?.trim()
    ) {
      await prisma.providerSetting.update({
        where: { key: "server-2" },
        data: { apiKey: s3.apiKey },
      });
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
    out.push({
      key,
      name: row?.name ?? `Server ${slot}`,
      providerType: type,
      baseUrl: row?.baseUrl ?? null,
      apiKey: row?.apiKey ?? null,
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
