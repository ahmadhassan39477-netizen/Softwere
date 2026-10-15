/**
 * Resolve Auth.js signing secret.
 * Vercel/UI pastes sometimes turn base64 "+" into spaces — repair that.
 * Never log the raw secret.
 */
export function resolveAuthSecret(): string | undefined {
  const raw =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";
  if (!raw) return undefined;

  // If it looks like mangled base64 (spaces, no plus), restore pluses
  let secret = raw;
  if (/\s/.test(secret) && !secret.includes("+")) {
    secret = secret.replace(/\s+/g, "+");
  }
  return secret || undefined;
}

export function authSecretDiagnostics() {
  const secret = resolveAuthSecret();
  return {
    hasAuthSecret: Boolean(secret),
    authSecretLength: secret?.length ?? 0,
    authSecretHasWhitespace: Boolean(secret && /\s/.test(secret)),
    hasAuthUrl: Boolean(process.env.AUTH_URL?.trim()),
    authUrl: process.env.AUTH_URL?.trim() || null,
    hasTrustHostEnv: process.env.AUTH_TRUST_HOST === "true",
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    databaseLooksPostgres: /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? ""),
    hasGoogleOAuth: Boolean(
      process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim(),
    ),
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || null,
  };
}
