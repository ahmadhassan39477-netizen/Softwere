import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import { smsAggregator } from "@/lib/sms/aggregator";
import { ensureServiceCountryCatalog } from "@/lib/sms/ensure-service-catalog";
import { maskKey } from "@/lib/sms/service-map";
import { decimalJson } from "@/lib/money";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  await ensureServiceCountryCatalog().catch(() => undefined);

  const settings = await prisma.providerSetting.findMany({
    orderBy: { priority: "asc" },
  });
  const balances = await smsAggregator.balances();
  const markup = await prisma.setting.findUnique({
    where: { key: "global_markup_percent" },
  });

  // Persist lastBalance probes (never store raw keys in response)
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
    providers: settings.map((s) => {
      const bal = balances.find((b) => b.key === s.key);
      return {
        id: s.id,
        key: s.key,
        name: s.name,
        enabled: s.enabled,
        priority: s.priority,
        markupPercent: decimalJson(s.markupPercent),
        hasApiKey: Boolean(s.apiKey?.trim()) || bal?.hasApiKey,
        apiKeyMasked: maskKey(s.apiKey),
        balance: bal?.balance ?? (s.lastBalance != null ? Number(s.lastBalance) : null),
        lastBalanceAt: s.lastBalanceAt,
        envConfigured: bal?.hasApiKey ?? false,
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

  await ensureServiceCountryCatalog().catch(() => undefined);

  const updated = await prisma.providerSetting.update({
    where: { key: parsed.data.key },
    data: {
      ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
      ...(parsed.data.apiKey !== undefined ? { apiKey: parsed.data.apiKey } : {}),
      ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
      ...(parsed.data.markupPercent !== undefined
        ? { markupPercent: new Prisma.Decimal(parsed.data.markupPercent) }
        : {}),
    },
  });

  // Keep legacy ProviderConfig in sync for older admin UI
  await prisma.providerConfig
    .upsert({
      where: { key: updated.key },
      create: {
        key: updated.key,
        name: updated.name,
        enabled: updated.enabled,
        apiKey: updated.apiKey,
      },
      update: {
        enabled: updated.enabled,
        ...(parsed.data.apiKey !== undefined ? { apiKey: parsed.data.apiKey } : {}),
      },
    })
    .catch(() => undefined);

  return Response.json({
    provider: {
      key: updated.key,
      enabled: updated.enabled,
      hasApiKey: Boolean(updated.apiKey),
      markupPercent: decimalJson(updated.markupPercent),
      priority: updated.priority,
    },
  });
}
