import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import { smsAggregator } from "@/lib/sms/aggregator";
import { ensureServiceCountryCatalog } from "@/lib/sms/ensure-service-catalog";
import { maskKey } from "@/lib/sms/service-map";
import {
  DEFAULT_SLOT_MARKUP,
  PROVIDER_TYPE_OPTIONS,
  defaultMarkupForType,
  displayNameForType,
  ensureProviderSlots,
  isSlotProviderType,
  loadProviderSlots,
  sanitizeApiKeyForType,
  slotKeyForServer,
  type SlotProviderType,
} from "@/lib/sms/provider-slots";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  await ensureServiceCountryCatalog().catch(() => undefined);
  await ensureProviderSlots().catch(() => undefined);

  const slots = await loadProviderSlots();
  const balances = await smsAggregator.balances();
  const markup = await prisma.setting.findUnique({
    where: { key: "global_markup_percent" },
  });

  for (const b of balances) {
    if (b.key === "mock") continue;
    if (b.balance != null) {
      await prisma.providerSetting
        .updateMany({
          where: { key: b.key },
          data: {
            lastBalance: new Prisma.Decimal(b.balance),
            lastBalanceAt: new Date(),
          },
        })
        .catch(() => undefined);
    }
  }

  return Response.json({
    markupPercent: markup?.value ?? process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20",
    providerTypes: PROVIDER_TYPE_OPTIONS,
    grizzlyDefaultMarkup: DEFAULT_SLOT_MARKUP,
    defaultSlotMarkup: DEFAULT_SLOT_MARKUP,
    providers: slots.map((s) => {
      const bal = balances.find((b) => b.key === s.key);
      const markupPct = s.markupPercent > 0 ? s.markupPercent : DEFAULT_SLOT_MARKUP;
      return {
        id: s.key,
        key: s.key,
        slot: s.priority,
        name: `Server ${s.priority}`,
        providerType: s.providerType,
        providerLabel: displayNameForType(s.providerType),
        baseUrl: s.baseUrl,
        enabled: s.enabled,
        priority: s.priority,
        markupPercent: String(markupPct),
        hasApiKey: Boolean(s.apiKey?.trim()) || Boolean(bal?.hasApiKey),
        apiKeyMasked: maskKey(s.apiKey),
        balance: bal?.balance ?? null,
        envConfigured: Boolean(bal?.hasApiKey && !s.apiKey?.trim()),
      };
    }),
  });
}

const patchSchema = z.object({
  key: z.string(),
  enabled: z.boolean().optional(),
  apiKey: z.string().nullable().optional(),
  markupPercent: z.number().min(0).max(500).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  providerType: z
    .enum(["sms-activate", "5sim", "grizzlysms", "sms-man", "custom-sa"])
    .optional(),
  baseUrl: z.string().nullable().optional(),
  globalMarkupPercent: z.number().min(0).max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input");

  if (parsed.data.globalMarkupPercent !== undefined) {
    await prisma.setting.upsert({
      where: { key: "global_markup_percent" },
      create: {
        key: "global_markup_percent",
        value: String(parsed.data.globalMarkupPercent),
      },
      update: { value: String(parsed.data.globalMarkupPercent) },
    });
  }

  await ensureProviderSlots().catch(() => undefined);
  await ensureServiceCountryCatalog().catch(() => undefined);

  // Accept legacy keys by mapping to slots
  let key = parsed.data.key;
  if (key === "sms-activate") key = slotKeyForServer(1);
  if (key === "5sim") key = slotKeyForServer(1);
  if (key === "grizzlysms") key = slotKeyForServer(2);
  if (key === "sms-man") key = slotKeyForServer(3);

  const existing = await prisma.providerSetting.findUnique({ where: { key } });
  if (!existing) return jsonError("Unknown server slot", 404);

  const nextType: SlotProviderType | undefined = parsed.data.providerType;
  let nextMarkup = parsed.data.markupPercent;

  // When changing type without an explicit margin, use uniform 20% default
  if (nextType && nextMarkup === undefined) {
    nextMarkup = DEFAULT_SLOT_MARKUP;
  }

  const typeForSanitize: SlotProviderType =
    nextType ??
    (isSlotProviderType(existing.providerType) ? existing.providerType : "sms-activate");

  // Reject get-sms docs URLs — never store as API keys
  let nextApiKey: string | null | undefined = undefined;
  if (parsed.data.apiKey !== undefined) {
    nextApiKey = sanitizeApiKeyForType(typeForSanitize, parsed.data.apiKey);
    if (parsed.data.apiKey?.trim() && nextApiKey == null) {
      return jsonError(
        "Invalid SMS-Man token — paste the profile token from sms-man.com, not a get-sms docs URL",
        400,
      );
    }
  }

  const updated = await prisma.providerSetting.update({
    where: { key },
    data: {
      ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
      ...(nextApiKey !== undefined ? { apiKey: nextApiKey } : {}),
      ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
      ...(nextType ? { providerType: nextType, name: `Server ${existing.priority}` } : {}),
      ...(parsed.data.baseUrl !== undefined ? { baseUrl: parsed.data.baseUrl } : {}),
      ...(nextMarkup !== undefined
        ? { markupPercent: new Prisma.Decimal(nextMarkup) }
        : {}),
    },
  });

  // Keep legacy ProviderConfig in sync (type key for older tooling)
  const typeKey = isSlotProviderType(updated.providerType)
    ? updated.providerType
    : "sms-activate";
  const legacyConfigKey =
    typeKey === "custom-sa" ? "sms-activate" : typeKey;
  await prisma.providerConfig
    .upsert({
      where: { key: legacyConfigKey },
      create: {
        key: legacyConfigKey,
        name: displayNameForType(typeKey as SlotProviderType),
        enabled: updated.enabled,
        apiKey: updated.apiKey,
      },
      update: {
        enabled: updated.enabled,
        ...(nextApiKey !== undefined ? { apiKey: nextApiKey } : {}),
      },
    })
    .catch(() => undefined);

  const markupOut = Number(updated.markupPercent) || DEFAULT_SLOT_MARKUP;

  return Response.json({
    provider: {
      key: updated.key,
      slot: updated.priority,
      providerType: updated.providerType,
      enabled: updated.enabled,
      hasApiKey: Boolean(updated.apiKey),
      markupPercent: String(markupOut),
      baseUrl: updated.baseUrl,
      priority: updated.priority,
      defaultMarkupHint: defaultMarkupForType(
        isSlotProviderType(updated.providerType)
          ? updated.providerType
          : "sms-activate",
      ),
    },
  });
}
