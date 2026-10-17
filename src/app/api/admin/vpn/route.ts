import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import {
  maskSecret,
  normalizeBaseUrl,
  normalizeProviderLabel,
  VPN_BASE_URL_SETTING_KEY,
  VPN_DISPLAY_SETTING_KEY,
  VPN_PROVIDER_SETTING_KEY,
  VPN_SETTING_KEY,
} from "@/lib/vpn-proxy";

async function readVpnSettings() {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          VPN_SETTING_KEY,
          VPN_PROVIDER_SETTING_KEY,
          VPN_BASE_URL_SETTING_KEY,
          VPN_DISPLAY_SETTING_KEY,
        ],
      },
    },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const apiKey = map[VPN_SETTING_KEY]?.trim() || "";
  return {
    hasApiKey: Boolean(apiKey),
    apiKeyMasked: maskSecret(apiKey),
    provider: map[VPN_PROVIDER_SETTING_KEY]?.trim() || "",
    displayName: normalizeProviderLabel(map[VPN_DISPLAY_SETTING_KEY]),
    baseUrl: map[VPN_BASE_URL_SETTING_KEY]?.trim() || "",
  };
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);
  return Response.json(await readVpnSettings());
}

const patchSchema = z.object({
  apiKey: z.string().max(500).optional(),
  clearKey: z.boolean().optional(),
  provider: z.string().max(80).optional(),
  displayName: z.string().max(80).optional(),
  baseUrl: z.string().max(200).optional(),
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

  if (typeof parsed.data.provider === "string") {
    await upsertSetting(VPN_PROVIDER_SETTING_KEY, parsed.data.provider.trim());
  }
  if (typeof parsed.data.displayName === "string") {
    await upsertSetting(VPN_DISPLAY_SETTING_KEY, normalizeProviderLabel(parsed.data.displayName));
  }
  if (typeof parsed.data.baseUrl === "string") {
    const url = normalizeBaseUrl(parsed.data.baseUrl);
    if (parsed.data.baseUrl.trim() && !url) return jsonError("Base URL must start with http");
    await upsertSetting(VPN_BASE_URL_SETTING_KEY, url ?? "");
  }

  return Response.json(await readVpnSettings());
}
