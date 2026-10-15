"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

export function GoogleSignInButton({ callbackUrl = "/services" }: { callbackUrl?: string }) {
  const [googleReady, setGoogleReady] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [healthRes, providersRes] = await Promise.all([
          fetch("/api/auth/health", { cache: "no-store" }),
          fetch("/api/auth/providers", { cache: "no-store" }),
        ]);
        const health = healthRes.ok ? await healthRes.json() : null;
        const providers = providersRes.ok ? await providersRes.json() : null;
        const ready = Boolean(health?.hasGoogleOAuth && providers?.google);
        if (!cancelled) setGoogleReady(ready);
      } catch {
        if (!cancelled) setGoogleReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onClick() {
    setMessage("");
    if (googleReady === false) {
      setMessage(
        "Google sign-in isn’t set up yet. Use email and password below, or ask the site owner to add Google in Vercel (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET).",
      );
      return;
    }
    try {
      const res = await signIn("google", { callbackUrl, redirect: false });
      if (res?.error) {
        setMessage(
          res.error === "Configuration" || res.error === "OAuthSignin"
            ? "Google isn’t configured on the server yet. Please sign in with email/password."
            : `Google sign-in failed (${res.error}). Try email/password.`,
        );
        return;
      }
      if (res?.url) {
        window.location.assign(res.url);
      }
    } catch {
      setMessage("Google sign-in isn’t available right now. Please use email/password.");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn btn-ghost w-full"
        onClick={onClick}
        aria-disabled={googleReady === false}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            fill="currentColor"
            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
          />
        </svg>
        Continue with Google
      </button>
      {googleReady === false && (
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Google sign-in isn’t configured yet — use email/password. Site owner: add{" "}
          <code className="text-[var(--accent)]">AUTH_GOOGLE_ID</code> and{" "}
          <code className="text-[var(--accent)]">AUTH_GOOGLE_SECRET</code> in Vercel (see Support /
          auth setup doc).
        </p>
      )}
      {message && <p className="text-sm text-[#fda4af]">{message}</p>}
    </div>
  );
}
