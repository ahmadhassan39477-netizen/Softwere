import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import { probeProxyCheap } from "@/lib/providers/proxy-cheap";
import {
  maskSecret,
  normalizeBaseUrl,
  normalizeDisplayName,
  normalizeProviderLabel,
  parseEnabled,
  parseMarkupPercent,
  VPN_BASE_URL_SETTING_KEY,
  VPN_DEFAULT_BASE_URL,
  VPN_DEFAULT_DISPLAY,
  VPN_DEFAULT_MARKUP,
  VPN_DEFAULT_PROVIDER,
  VPN_DISPLAY_SETTING_KEY,
  VPN_ENABLED_SETTING_KEY,
  VPN_MARKUP_SETTING_KEY,
  VPN_PROVIDER_SETTING_KEY,
  VPN_SECRET_SETTING_KEY,
  VPN_SETTING_KEY,
  VPN_SETTING_KEYS,
} from "@/lib/vpn-proxy";

type SettingMap = Record<string, string>;

async function loadMap(): Promise<SettingMap> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...VPN_SETTING_KEYS] } },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

async function readVpnSettings(opts: { probe?: boolean } = {}) {
  const map = await loadMap();
  const apiKey = map[VPN_SETTING_KEY]?.trim() || "";
  const apiSecret = map[VPN_SECRET_SETTING_KEY]?.trim() || "";
  const enabled = parseEnabled(map[VPN_ENABLED_SETTING_KEY], true);
  const markupPercent = parseMarkupPercent(map[VPN_MARKUP_SETTING_KEY]);
  const provider = normalizeProviderLabel(map[VPN_PROVIDER_SETTING_KEY] || VPN_DEFAULT_PROVIDER);
  const displayName = normalizeDisplayName(map[VPN_DISPLAY_SETTING_KEY] || VPN_DEFAULT_DISPLAY);
  const baseUrl = map[VPN_BASE_URL_SETTING_KEY]?.trim() || VPN_DEFAULT_BASE_URL;
  const ready = Boolean(apiKey && apiSecret);

  let live: boolean | null = null;
  let livePlanCount: number | null = null;
  let balance: number | null = null;
  let probeError: string | undefined;
  if (opts.probe && ready) {
    const probe = await probeProxyCheap({
      apiKey,
      apiSecret,
      baseUrl,
    }).catch(() => ({ live: false, planCount: 0, balance: null, error: "Probe failed" }));
    live = probe.live;
    livePlanCount = probe.planCount;
    balance = probe.balance;
    probeError = probe.error;
  }

  return {
    provider,
    displayName,
    baseUrl,
    enabled,
    markupPercent,
    hasApiKey: Boolean(apiKey),
    apiKeyMasked: maskSecret(apiKey),
    hasApiSecret: Boolean(apiSecret),
    apiSecretMasked: maskSecret(apiSecret),
    ready,
    live,
    livePlanCount,
    balance,
    probeError: probeError ?? null,
  };
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);
  const probe = req.nextUrl.searchParams.get("probe") === "1";
  return Response.json(await readVpnSettings({ probe }));
}

const patchSchema = z.object({
  apiKey: z.string().max(500).optional(),
  apiSecret: z.string().max(500).optional(),
  apiUser: z.string().max(500).optional(),
  clearKey: z.boolean().optional(),
  clearSecret: z.boolean().optional(),
  provider: z.string().max(80).optional(),
  displayName: z.string().max(80).optional(),
  baseUrl: z.string().max(200).optional(),
  enabled: z.boolean().optional(),
  markupPercent: z.number().min(0).max(500).optional(),
  probe: z.boolean().optional(),
});

async function upsertSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid VPN settings");

  if (parsed.data.clearKey) {
    await prisma.setting.deleteMany({ where: { key: VPN_SETTING_KEY } });
  } else if (typeof parsed.data.apiKey === "string" && parsed.data.apiKey.trim()) {
    await upsertSetting(VPN_SETTING_KEY, parsed.data.apiKey.trim());
  }

  const secretIn = parsed.data.apiSecret ?? parsed.data.apiUser;
  if (parsed.data.clearSecret) {
    await prisma.setting.deleteMany({ where: { key: VPN_SECRET_SETTING_KEY } });
  } else if (typeof secretIn === "string" && secretIn.trim()) {
    await upsertSetting(VPN_SECRET_SETTING_KEY, secretIn.trim());
  }

  if (typeof parsed.data.provider === "string") {
    await upsertSetting(VPN_PROVIDER_SETTING_KEY, normalizeProviderLabel(parsed.data.provider));
  } else {
    await upsertSetting(VPN_PROVIDER_SETTING_KEY, VPN_DEFAULT_PROVIDER);
  }
  if (typeof parsed.data.displayName === "string") {
    await upsertSetting(VPN_DISPLAY_SETTING_KEY, normalizeDisplayName(parsed.data.displayName));
  }
  if (typeof parsed.data.baseUrl === "string") {
    const url = normalizeBaseUrl(parsed.data.baseUrl);
    if (parsed.data.baseUrl.trim() && !url) return jsonError("Base URL must start with http");
    await upsertSetting(VPN_BASE_URL_SETTING_KEY, url ?? VPN_DEFAULT_BASE_URL);
  }
  if (typeof parsed.data.enabled === "boolean") {
    await upsertSetting(VPN_ENABLED_SETTING_KEY, parsed.data.enabled ? "true" : "false");
  }
  if (typeof parsed.data.markupPercent === "number") {
    await upsertSetting(VPN_MARKUP_SETTING_KEY, String(parsed.data.markupPercent));
  }

  const probe = parsed.data.probe !== false;
  return Response.json(await readVpnSettings({ probe }));
}
