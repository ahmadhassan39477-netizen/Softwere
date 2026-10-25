/**
 * CLI wrapper for aqbeds2822 double-refund audit (needs Postgres DATABASE_URL).
 * Prefer production Admin: POST /api/admin/wallet-audit-correct { apply: true }
 *
 *   DATABASE_URL=… npx prisma generate --schema=prisma/schema.postgres.prisma
 *   DATABASE_URL=… npx tsx scripts/wallet-audit-aqbeds2822.ts
 *   DATABASE_URL=… npx tsx scripts/wallet-audit-aqbeds2822.ts --apply
 */
import {
  auditAndCorrectWallet,
  walletAuditJson,
} from "../src/lib/wallet-audit-correct";

const APPLY = process.argv.includes("--apply");

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url || url.startsWith("file:")) {
    console.error("Need production Postgres DATABASE_URL (or use Admin API on www)");
    process.exit(1);
  }
  const summary = await auditAndCorrectWallet({
    apply: APPLY,
    adminId: "cli",
  });
  console.info(JSON.stringify(walletAuditJson(summary), null, 2));
}

main().catch((err) => {
  console.error("[audit] failed", err instanceof Error ? err.message : err);
  process.exit(1);
});
