import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import {
  WALLET_AUDIT_TARGET_EMAIL,
  auditAndCorrectWallet,
  walletAuditJson,
} from "@/lib/wallet-audit-correct";

const schema = z.object({
  /** Defaults to aqbeds2822@gmail.com — one-shot double-refund backfill target */
  email: z.string().email().optional(),
  /** When true, write ADJUSTMENT debit for surplus. Default false (dry-run). */
  apply: z.boolean().optional(),
});

/**
 * Admin-only: reconstruct wallet from ledger + orders, optionally debit surplus
 * from pre-6413916 double-refund over-credits via ADJUSTMENT (never silent rewrite).
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) return jsonError("Invalid input");

  const email = (parsed.data.email ?? WALLET_AUDIT_TARGET_EMAIL).toLowerCase().trim();
  // Hard-scope this one-shot route to the named audit user (and close typos)
  if (!email.includes("aqbeds2822")) {
    return jsonError("This one-shot audit only allows aqbeds2822@gmail.com", 403);
  }

  try {
    const summary = await auditAndCorrectWallet({
      email,
      apply: Boolean(parsed.data.apply),
      adminId: admin.id,
    });
    return Response.json(walletAuditJson(summary));
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500;
    const message = err instanceof Error ? err.message : "Audit failed";
    return jsonError(message, status);
  }
}

/** Dry-run GET for the fixed target email. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  try {
    const summary = await auditAndCorrectWallet({
      email: WALLET_AUDIT_TARGET_EMAIL,
      apply: false,
      adminId: admin.id,
    });
    return Response.json(walletAuditJson(summary));
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500;
    const message = err instanceof Error ? err.message : "Audit failed";
    return jsonError(message, status);
  }
}
