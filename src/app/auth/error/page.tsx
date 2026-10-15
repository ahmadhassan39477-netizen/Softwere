import Link from "next/link";
import { BrandWordmark } from "@/components/brand-mark";

const HINTS: Record<string, string> = {
  Configuration:
    "Auth is misconfigured on the server. Usually AUTH_SECRET or AUTH_URL is missing in Vercel, or the database tables were never created on Neon.",
  AccessDenied: "That sign-in was denied. Try another account or email/password.",
  Verification: "The sign-in link expired or was already used. Try again.",
  Default: "Something went wrong during sign-in. Try again, or use email/password.",
  OAuthAccountNotLinked:
    "This email is already registered with a password. Sign in with email/password, or use the same Google account.",
  OAuthCallback: "Google callback failed. Confirm the redirect URI is https://www.tempempire.store/api/auth/callback/google",
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AuthErrorPage({ searchParams }: Props) {
  const sp = await searchParams;
  const code = sp.error ?? "Default";
  const hint = HINTS[code] ?? HINTS.Default;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="panel panel-accent w-full max-w-lg p-8 space-y-5">
        <BrandWordmark />
        <div>
          <p className="eyebrow">Sign-in</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Couldn’t finish sign-in</h1>
        </div>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{hint}</p>
        <p className="mono-data text-[11px] text-[var(--text-muted)]">Error code: {code}</p>
        <ul className="text-sm text-[var(--text-muted)] space-y-2 list-disc pl-5">
          <li>
            Vercel env must include <code className="text-[var(--accent)]">AUTH_SECRET</code>,{" "}
            <code className="text-[var(--accent)]">AUTH_URL=https://www.tempempire.store</code>,{" "}
            <code className="text-[var(--accent)]">AUTH_TRUST_HOST=true</code>, and{" "}
            <code className="text-[var(--accent)]">DATABASE_URL</code> (Neon).
          </li>
          <li>After a code deploy, Sync your GitHub fork and Redeploy so Neon tables are pushed.</li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="btn btn-primary">
            Back to sign in
          </Link>
          <Link href="/support" className="btn btn-ghost">
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
