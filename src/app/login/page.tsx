"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useMemo, useState } from "react";
import { BrandWordmark } from "@/components/brand-mark";
import { PasswordField } from "@/components/password-field";
import { DEFAULT_POST_AUTH, postAuthDestination } from "@/lib/post-auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") return DEFAULT_POST_AUTH;
    return postAuthDestination(new URLSearchParams(window.location.search).get("callbackUrl"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const next = postAuthDestination(
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("callbackUrl")
        : callbackUrl,
    );
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: next,
    });
    setLoading(false);
    if (!res || res.error) {
      setError(
        res?.error === "CredentialsSignin"
          ? "Invalid email or password"
          : res?.error || "Sign-in failed",
      );
      return;
    }
    window.location.assign(next);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="panel panel-accent w-full max-w-md p-8 space-y-5 rise-in">
        <BrandWordmark priority />
        <div>
          <p className="eyebrow">Access</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Sign in with your Temp Empire email and password.
          </p>
        </div>
        <div>
          <label className="text-sm text-[var(--text-muted)]" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="input mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <PasswordField
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        {error && <p className="text-sm text-[#fda4af]">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-sm text-[var(--text-muted)] text-center">
          No account?{" "}
          <Link href="/register?callbackUrl=/services" className="text-[var(--accent)]">
            Create account
          </Link>
        </p>
        <p className="text-xs text-[var(--text-muted)] text-center">
          <Link href="/privacy" className="text-[var(--accent)]">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="text-[var(--accent)]">
            Terms
          </Link>
          {" · "}
          <Link href="/support" className="text-[var(--accent)]">
            Contact
          </Link>
        </p>
      </form>
    </div>
  );
}
