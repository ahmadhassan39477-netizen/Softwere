"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { BrandWordmark } from "@/components/brand-mark";
import { PasswordField } from "@/components/password-field";

function safeCallback(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/deposit";
  return raw;
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "/deposit";
    return safeCallback(new URLSearchParams(window.location.search).get("callbackUrl"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Registration failed");
      return;
    }
    const next = safeCallback(
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("callbackUrl")
        : callbackUrl,
    );
    const sign = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: next,
    });
    setLoading(false);
    if (sign?.error) {
      setError(sign.error);
      return;
    }
    window.location.assign(next);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="panel panel-accent w-full max-w-md p-8 space-y-5 rise-in">
        <BrandWordmark />
        <div>
          <p className="eyebrow">Access</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Create an account first. Next you add credit on WhatsApp{" "}
            <span className="mono-data">03072577778</span>, then buy a number on Services. Email
            and password only.
          </p>
        </div>
        <div>
          <label className="text-sm text-[var(--text-muted)]" htmlFor="reg-name">
            Name
          </label>
          <input
            id="reg-name"
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          <label className="text-sm text-[var(--text-muted)]" htmlFor="reg-email">
            Email
          </label>
          <input
            id="reg-email"
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
          autoComplete="new-password"
          minLength={8}
          required
        />
        {error && <p className="text-sm text-[#fda4af]">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="text-sm text-[var(--text-muted)] text-center">
          Have an account?{" "}
          <Link href="/login" className="text-[var(--accent)]">
            Sign in
          </Link>
        </p>
        <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
          By creating an account you agree to the{" "}
          <Link href="/terms" className="text-[var(--accent)]">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[var(--accent)]">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
