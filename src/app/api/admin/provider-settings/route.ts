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
  envKeyForType,
  isSlotProviderType,
  loadProviderSlots,
  looksLikeApiDocsUrl,
  retailFromWholesale,
  sanitizeApiKeyForType,
  slotKeyForServer,
  type SlotProviderType,
} from "@/lib/sms/provider-slots";
import { isSmsManDocsUrl, probeSmsManToken } from "@/lib/sms/adapters/sms-man";
import { probeGrizzlyApiKey } from "@/lib/sms/adapters/grizzlysms";
import { probeFiveSimApiKey } from "@/lib/sms/adapters/fivesim";
import { fetchLiveStockBySlot } from "@/lib/sms/live-stock";

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

  // Live price probe (US/WhatsApp) — never includes tokens
  const wantProbe = req.nextUrl.searchParams.get("probe") === "1";
  let liveProbe: Record<
    string,
    {
      liveRows: number;
      whatsappWholesale: number | null;
      whatsappRetail: number | null;
      live: boolean;
    }
  > | null = null;
  if (wantProbe) {
    const bySlot = await fetchLiveStockBySlot("US").catch(() => new Map());
    liveProbe = {};
    for (const s of slots) {
      const entry = bySlot.get(s.priority);
      const wa = entry?.bySlug.get("whatsapp");
      const markupPct = s.markupPercent > 0 ? s.markupPercent : DEFAULT_SLOT_MARKUP;
      liveProbe[s.key] = {
        liveRows: entry?.bySlug.size ?? 0,
        whatsappWholesale: wa && wa.wholesale > 0 ? wa.wholesale : null,
        whatsappRetail:
          wa && wa.wholesale > 0 ? retailFromWholesale(wa.wholesale, markupPct) : null,
        live: Boolean(wa && wa.wholesale > 0),
      };
    }
  }

  // Raw DB keys for docs-URL detection (loadProviderSlots already strips bad SMS-Man values)
  const rawRows = await prisma.providerSetting.findMany({
    where: { key: { in: slots.map((s) => s.key) } },
    select: { key: true, apiKey: true, lastBalance: true },
  });
  const rawByKey = new Map(rawRows.map((r) => [r.key, r]));

  return Response.json({
    markupPercent: markup?.value ?? process.env.GLOBAL_PRICE_MARKUP_PERCENT ?? "20",
    providerTypes: PROVIDER_TYPE_OPTIONS,
    grizzlyDefaultMarkup: DEFAULT_SLOT_MARKUP,
    defaultSlotMarkup: DEFAULT_SLOT_MARKUP,
    liveProbe,
    providers: slots.map((s) => {
      const bal = balances.find((b) => b.key === s.key);
      const markupPct = s.markupPercent > 0 ? s.markupPercent : DEFAULT_SLOT_MARKUP;
      const rawRow = rawByKey.get(s.key);
      const rawDb = rawRow?.apiKey?.trim() ?? "";
      const typeOk = isSlotProviderType(s.providerType)
        ? s.providerType
        : ("sms-activate" as SlotProviderType);
      // Slot DB key only — never count Vercel/env as a saved Admin key
      const slotKeyOnly =
        sanitizeApiKeyForType(typeOk, rawDb) ??
        sanitizeApiKeyForType(typeOk, s.apiKey);
      const docsUrlStored = Boolean(rawDb) && looksLikeApiDocsUrl(rawDb);
      const hasRealKey = Boolean(slotKeyOnly);
      const lastBal =
        rawRow?.lastBalance != null ? Number(rawRow.lastBalance) : null;
      // Prefer live wallet for the Admin slot key; fall back to last probed Save-key balance
      const balance =
        bal?.balance ??
        (hasRealKey && lastBal != null && Number.isFinite(lastBal) ? lastBal : null);
      const envRaw = envKeyForType(typeOk)?.trim() || "";
      const envUsable = Boolean(sanitizeApiKeyForType(typeOk, envRaw));
      const envJunkUrl =
        !hasRealKey && Boolean(envRaw) && !envUsable;
      // Only flag a *usable* env leftover — URL/junk in Vercel is not a wallet key
      const envOnly = !hasRealKey && envUsable;
      // buy ready = Enabled + Admin key + positive wallet on THAT key (never env-only)
      const buyReady =
        s.enabled && hasRealKey && balance != null && Number(balance) > 0;
      const buyBlockedReason = !s.enabled
        ? "off"
        : !hasRealKey
          ? "no_key"
          : balance == null || Number(balance) <= 0
            ? "no_balance"
            : null;
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
        hasApiKey: hasRealKey,
        apiKeyMasked: hasRealKey
          ? maskKey(slotKeyOnly)
          : docsUrlStored
            ? "(URL rejected — paste API key only)"
            : maskKey(null),
        balance,
        envConfigured: envOnly,
        envJunkUrl,
        buyReady,
        buyBlockedReason,
        // Safe flags only — never echo token
        tokenLooksLikeDocsUrl: docsUrlStored,
        live: liveProbe?.[s.key]?.live ?? null,
        livePriceRows: liveProbe?.[s.key]?.liveRows ?? null,
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

  // Reject docs/HTTP URL pastes — never store as API keys; never log the pasted value
  let nextApiKey: string | null | undefined = undefined;
  let probedFiveSimBalance: number | null | undefined = undefined;
  if (parsed.data.apiKey !== undefined) {
    const raw = parsed.data.apiKey;
    if (raw?.trim() && looksLikeApiDocsUrl(raw)) {
      if (typeForSanitize === "5sim" || /5sim\.net|product-balance|\/v1\//i.test(raw)) {
        return jsonError(
          "Paste only the API key from 5sim.net → Profile / Settings, not a URL (no GET, http, product-balance, or guest/products).",
          400,
        );
      }
      if (typeForSanitize === "sms-man" || isSmsManDocsUrl(raw)) {
        return jsonError(
          "That looks like an SMS-Man docs/API URL, not your profile token. Open sms-man.com → Profile → copy the API token only (no get-sms?token=… URL), then Save key.",
          400,
        );
      }
      return jsonError(
        "That looks like a URL or HTTP request, not an API key. Paste only the token from the provider profile/settings page.",
        400,
      );
    }
    nextApiKey = sanitizeApiKeyForType(typeForSanitize, raw);
    if (raw?.trim() && nextApiKey == null) {
      if (typeForSanitize === "5sim") {
        return jsonError(
          "Invalid 5SIM key — paste only the API key from 5sim.net profile/settings, not a URL.",
          400,
        );
      }
      if (typeForSanitize === "sms-man") {
        return jsonError(
          "Invalid API key — for SMS-Man paste the profile token only, not a get-sms docs URL.",
          400,
        );
      }
      return jsonError("Invalid API key — paste the provider token only, not a URL.", 400);
    }
    // Verify keys before saving (never log the pasted value).
    // 5SIM: hard-reject only auth failures — network blips must not block Save key persist.
    if (nextApiKey && typeForSanitize === "5sim") {
      const probe = await probeFiveSimApiKey(nextApiKey);
      if (!probe.ok && /rejected this key/i.test(probe.error ?? "")) {
        return jsonError(
          probe.error ??
            "5SIM rejected this key. Copy the API key from the same 5sim.net account you topped up.",
          400,
        );
      }
      if (probe.ok) probedFiveSimBalance = probe.balance;
      // else: still persist the token; balance fills on next Admin refresh
    }
    if (nextApiKey && typeForSanitize === "sms-man") {
      const probe = await probeSmsManToken(nextApiKey);
      if (!probe.ok) {
        return jsonError(
          probe.error ??
            "SMS-Man rejected this token. Paste the profile API token from sms-man.com.",
          400,
        );
      }
    }
    if (nextApiKey && typeForSanitize === "grizzlysms") {
      const probe = await probeGrizzlyApiKey(nextApiKey, existing.baseUrl);
      if (!probe.ok) {
        return jsonError(
          probe.error ??
            "Grizzly rejected this API key. Copy the api_key from grizzlysms.com and try again.",
          400,
        );
      }
    }
  }

  // Switching onto SMS-Man clears a previous provider's key (e.g. Grizzly) so it
  // is never sent to api.sms-man.com/control. Do not force-enable without a token.
  let clearKeyOnTypeFlip = false;
  if (
    nextType === "sms-man" &&
    existing.providerType !== "sms-man" &&
    nextApiKey === undefined
  ) {
    clearKeyOnTypeFlip = true;
  }

  const effectiveKeyAfter =
    nextApiKey !== undefined
      ? nextApiKey
      : clearKeyOnTypeFlip
        ? null
        : existing.apiKey;

  // Saving a valid key always turns the slot on (Enable must stick with a key on file)
  let nextEnabled = parsed.data.enabled;
  if (
    nextEnabled === undefined &&
    nextApiKey !== undefined &&
    Boolean(effectiveKeyAfter?.trim())
  ) {
    nextEnabled = true;
  }

  const updated = await prisma.providerSetting.update({
    where: { key },
    data: {
      ...(nextEnabled !== undefined ? { enabled: nextEnabled } : {}),
      ...(nextApiKey !== undefined
        ? { apiKey: nextApiKey }
        : clearKeyOnTypeFlip
          ? { apiKey: null }
          : {}),
      ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
      ...(nextType ? { providerType: nextType, name: `Server ${existing.priority}` } : {}),
      ...(parsed.data.baseUrl !== undefined ? { baseUrl: parsed.data.baseUrl } : {}),
      ...(nextMarkup !== undefined
        ? { markupPercent: new Prisma.Decimal(nextMarkup) }
        : {}),
      ...(probedFiveSimBalance !== undefined && probedFiveSimBalance != null
        ? {
            lastBalance: new Prisma.Decimal(probedFiveSimBalance),
            lastBalanceAt: new Date(),
          }
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
