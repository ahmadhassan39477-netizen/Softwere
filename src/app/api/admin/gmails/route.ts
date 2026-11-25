import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import { listGmailOffers, loadGmailMarkupPercent } from "@/lib/gmail-catalog";
import {
  GMAIL_MARKUP_PERCENT,
  GMAIL_MARKUP_SETTING_KEY,
  parseGmailMarkupPercent,
} from "@/lib/smsbower-mail";

async function upsertSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

async function readGmailAdmin(opts: { probe?: boolean } = {}) {
  const markupPercent = await loadGmailMarkupPercent();
  let ready = false;
  let offerCount = 0;
  let sampleWholesale: number | null = null;
  let sampleRetail: number | null = null;
  let reason: string | undefined;

  if (opts.probe) {
    const catalog = await listGmailOffers();
    ready = catalog.ready;
    reason = catalog.reason;
    offerCount = catalog.offers.length;
    const sample = catalog.offers[0];
    if (sample) {
      sampleWholesale = sample.wholesale;
      sampleRetail = sample.retail;
    }
  }

  return {
    markupPercent,
    defaultMarkupPercent: GMAIL_MARKUP_PERCENT,
    settingKey: GMAIL_MARKUP_SETTING_KEY,
    /** Gmails use this Setting — not Server 3 ProviderSetting.markupPercent. */
    independentOfServer3: true,
    ready,
    reason: reason ?? null,
    offerCount,
    sampleWholesale,
    sampleRetail,
    sampleRatio:
      sampleWholesale != null && sampleWholesale > 0 && sampleRetail != null
        ? Number((sampleRetail / sampleWholesale).toFixed(4))
        : null,
  };
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);
  const probe = req.nextUrl.searchParams.get("probe") === "1";
  return Response.json(await readGmailAdmin({ probe }));
}

const patchSchema = z.object({
  markupPercent: z.number().min(0).max(500),
  probe: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid Gmail settings");

  const next = parseGmailMarkupPercent(parsed.data.markupPercent);
  await upsertSetting(GMAIL_MARKUP_SETTING_KEY, String(next));

  const probe = parsed.data.probe !== false;
  return Response.json(await readGmailAdmin({ probe }));
}
