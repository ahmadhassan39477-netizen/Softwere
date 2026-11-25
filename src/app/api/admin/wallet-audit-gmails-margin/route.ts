import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import {
  GMAILS_TARGET_MARKUP_PERCENT,
  auditGmailsMarginUndercharge,
  gmailsMarginAuditJson,
} from "@/lib/wallet-audit-gmails-margin";

const schema = z.object({
  /** Intended Gmail margin % (default 50). */
  targetMarkupPercent: z.number().min(0).max(500).optional(),
  /** ISO date — only orders created on/after this instant. */
  since: z.string().datetime().optional(),
  /** When true, write idempotent ADJUSTMENT debits per undercharged user. Default false. */
  apply: z.boolean().optional(),
});

/**
 * Admin-only: Gmails undercharge vs intended margin (prior fixed 40% → 50%).
 * Dry-run by default. apply=true claws shortfall with ledger externalId
 * audit:gmails-margin:50:<userId> (idempotent).
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) return jsonError("Invalid input");

  let since: Date | null = null;
  if (parsed.data.since) {
    since = new Date(parsed.data.since);
    if (Number.isNaN(since.getTime())) return jsonError("Invalid since datetime");
  }

  try {
    const summary = await auditGmailsMarginUndercharge({
      targetMarkupPercent:
        parsed.data.targetMarkupPercent ?? GMAILS_TARGET_MARKUP_PERCENT,
      since,
      apply: Boolean(parsed.data.apply),
      adminId: admin.id,
    });
    return Response.json(gmailsMarginAuditJson(summary));
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500;
    const message = err instanceof Error ? err.message : "Audit failed";
    return jsonError(message, status);
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const sinceParam = req.nextUrl.searchParams.get("since");
  let since: Date | null = null;
  if (sinceParam) {
    since = new Date(sinceParam);
    if (Number.isNaN(since.getTime())) return jsonError("Invalid since datetime");
  }

  const targetRaw = req.nextUrl.searchParams.get("targetMarkupPercent");
  const targetMarkupPercent = targetRaw
    ? Number(targetRaw)
    : GMAILS_TARGET_MARKUP_PERCENT;

  try {
    const summary = await auditGmailsMarginUndercharge({
      targetMarkupPercent,
      since,
      apply: false,
      adminId: admin.id,
    });
    return Response.json(gmailsMarginAuditJson(summary));
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500;
    const message = err instanceof Error ? err.message : "Audit failed";
    return jsonError(message, status);
  }
}
