import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProviderKey } from "./types";

/** Admin Server 1/2/3 slot keys. */
export const SLOT_KEYS = ["server-1", "server-2", "server-3"] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

export type SlotProviderType = "sms-activate" | "5sim" | "grizzlysms" | "custom-sa";

export const PROVIDER_TYPE_OPTIONS: {
  value: SlotProviderType;
  label: string;
  defaultMarkup: number;
}[] = [
  { value: "sms-activate", label: "SMS-Activate", defaultMarkup: 20 },
  { value: "5sim", label: "5SIM", defaultMarkup: 20 },
  { value: "grizzlysms", label: "Grizzly SMS", defaultMarkup: 40 },
  { value: "custom-sa", label: "Custom (SMS-Activate API)", defaultMarkup: 20 },
];

/** Grizzly retail = wholesale × 1.40 */
export const GRIZZLY_DEFAULT_MARKUP = 40;

export function slotKeyForServer(server: 1 | 2 | 3): SlotKey {
  return `server-${server}` as SlotKey;
}

export function serverFromSlotKey(key: string): 1 | 2 | 3 | null {
  if (key === "server-1") return 1;
  if (key === "server-2") return 2;
  if (key === "server-3") return 3;
  return null;
}

export function defaultMarkupForType(type: SlotProviderType): number {
  return type === "grizzlysms" ? GRIZZLY_DEFAULT_MARKUP : 20;
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

const LEGACY_DEFAULTS: {
  oldKey: string;
  slot: 1 | 2 | 3;
  type: SlotProviderType;
}[] = [
  { oldKey: "sms-activate", slot: 1, type: "sms-activate" },
  { oldKey: "5sim", slot: 2, type: "5sim" },
  { oldKey: "grizzlysms", slot: 3, type: "grizzlysms" },
];

/**
 * Ensure server-1/2/3 slots exist; migrate legacy provider keys; apply Grizzly 40% default.
 * Prefer Admin apiKey over env at read time (caller responsibility).
 */
export async function ensureProviderSlots(): Promise<void> {
  const markupDefault = process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20";

  for (const legacy of LEGACY_DEFAULTS) {
    const slotKey = slotKeyForServer(legacy.slot);
    const existingSlot = await prisma.providerSetting.findUnique({ where: { key: slotKey } });
    const legacyRow = await prisma.providerSetting.findUnique({ where: { key: legacy.oldKey } });

    if (!existingSlot) {
      // Map from legacy key name (sms-activate/5sim/grizzlysms), not the new column default
      const type: SlotProviderType = legacy.type;
      const markup =
        type === "grizzlysms"
          ? GRIZZLY_DEFAULT_MARKUP
          : Number(legacyRow?.markupPercent ?? markupDefault);

      await prisma.providerSetting.create({
        data: {
          key: slotKey,
          name: `Server ${legacy.slot}`,
          providerType: type,
          baseUrl: null,
          apiKey: legacyRow?.apiKey ?? null,
          enabled: legacyRow?.enabled ?? true,
          priority: legacy.slot,
          markupPercent: new Prisma.Decimal(markup),
        },
      });
    } else {
      const updates: Prisma.ProviderSettingUpdateInput = {};
      // Repair slots that inherited schema default sms-activate before type was set
      const looksUnconfigured =
        existingSlot.providerType === "sms-activate" &&
        legacy.type !== "sms-activate" &&
        !existingSlot.apiKey?.trim() &&
        !existingSlot.baseUrl?.trim();
      if (looksUnconfigured || !isSlotProviderType(existingSlot.providerType)) {
        updates.providerType = legacy.type;
      }
      const effectiveType: SlotProviderType =
        (updates.providerType as SlotProviderType | undefined) ??
        (isSlotProviderType(existingSlot.providerType)
          ? existingSlot.providerType
          : legacy.type);
      if (
        effectiveType === "grizzlysms" &&
        Number(existingSlot.markupPercent) === 20
      ) {
        updates.markupPercent = new Prisma.Decimal(GRIZZLY_DEFAULT_MARKUP);
      }
      if (!existingSlot.name?.startsWith("Server")) {
        updates.name = `Server ${legacy.slot}`;
      }
      if (Object.keys(updates).length > 0) {
        await prisma.providerSetting.update({ where: { key: slotKey }, data: updates });
      }

      if (!existingSlot.apiKey?.trim() && legacyRow?.apiKey?.trim()) {
        await prisma.providerSetting.update({
          where: { key: slotKey },
          data: { apiKey: legacyRow.apiKey },
        });
      }
    }
  }
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
      row && isSlotProviderType(row.providerType) ? row.providerType : LEGACY_DEFAULTS[slot - 1].type;
    out.push({
      key,
      name: row?.name ?? `Server ${slot}`,
      providerType: type,
      baseUrl: row?.baseUrl ?? null,
      apiKey: row?.apiKey ?? null,
      enabled: row?.enabled ?? true,
      priority: slot,
      markupPercent: Number(
        row?.markupPercent ?? defaultMarkupForType(type),
      ),
    });
  }
  return out;
}

/** Markup % for a server slot (Grizzly → 40 unless Admin overrode). */
export async function markupForServer(server: 1 | 2 | 3): Promise<number> {
  const slots = await loadProviderSlots();
  const slot = slots.find((s) => s.priority === server);
  if (!slot) return 20;
  if (slot.providerType === "grizzlysms") {
    return slot.markupPercent > 0 ? slot.markupPercent : GRIZZLY_DEFAULT_MARKUP;
  }
  return slot.markupPercent > 0 ? slot.markupPercent : 20;
}

export function retailFromWholesale(wholesale: number, markupPercent: number): number {
  return Number((wholesale * (1 + markupPercent / 100)).toFixed(4));
}
