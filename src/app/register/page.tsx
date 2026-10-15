"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { BrandWordmark } from "@/components/brand-mark";
import { PasswordField } from "@/components/password-field";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    const sign = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/services",
    });
    setLoading(false);
    if (sign?.error) {
      setError(sign.error);
      return;
    }
    window.location.assign("/services");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="panel panel-accent w-full max-w-md p-8 space-y-5 rise-in">
        <BrandWordmark />
        <div>
          <p className="eyebrow">Access</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Free signup worldwide. Your wallet starts at $0.00 — fund anytime via WhatsApp deposit.
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
      </form>
    </div>
  );
}
