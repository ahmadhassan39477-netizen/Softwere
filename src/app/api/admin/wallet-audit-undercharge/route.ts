import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import {
  UNDERCHARGE_AUDIT_TARGET_EMAIL,
  auditUnderchargeSuccessfulOtps,
  underchargeAuditJson,
} from "@/lib/wallet-audit-undercharge";

const schema = z.object({
  /** Defaults to aqbeds2822@gmail.com */
  email: z.string().email().optional(),
  /** When true, write ADJUSTMENT debit for shortfall only. Default false (dry-run). */
  apply: z.boolean().optional(),
});

/**
 * Admin-only: successful-OTP undercharge audit (debit ledger vs order.price /
 * wholesale×1.20). Optional ADJUSTMENT clawback — never touches a correct balance.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) return jsonError("Invalid input");

  const email = (parsed.data.email ?? UNDERCHARGE_AUDIT_TARGET_EMAIL).toLowerCase().trim();
  if (!email.includes("aqbeds2822")) {
    return jsonError("This one-shot audit only allows aqbeds2822@gmail.com", 403);
  }

  try {
    const summary = await auditUnderchargeSuccessfulOtps({
      email,
      apply: Boolean(parsed.data.apply),
      adminId: admin.id,
    });
    return Response.json(underchargeAuditJson(summary));
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500;
    const message = err instanceof Error ? err.message : "Audit failed";
    return jsonError(message, status);
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  try {
    const summary = await auditUnderchargeSuccessfulOtps({
      email: UNDERCHARGE_AUDIT_TARGET_EMAIL,
      apply: false,
      adminId: admin.id,
    });
    return Response.json(underchargeAuditJson(summary));
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500;
    const message = err instanceof Error ? err.message : "Audit failed";
    return jsonError(message, status);
  }
}
