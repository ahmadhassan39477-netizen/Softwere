import { authSecretDiagnostics } from "@/lib/auth-secret";

/**
 * Public, non-secret diagnostics for Auth.js / Vercel env.
 * Does not return AUTH_SECRET or DATABASE_URL values.
 */
export async function GET() {
  const d = authSecretDiagnostics();
  return Response.json(
    {
      ...d,
      // Hint for operators: live was stuck on 7a7378f until fork synced
      hint: !d.hasAuthSecret
        ? "AUTH_SECRET missing at runtime — set in Vercel Production and Redeploy"
        : !d.databaseLooksPostgres
          ? "DATABASE_URL missing or not Postgres — Neon pooled URL required"
          : !d.hasAuthUrl
            ? "Set AUTH_URL=https://www.tempempire.store"
            : "Secrets present. If /api/auth/providers still 500, Sync fork to latest main and Redeploy.",
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
