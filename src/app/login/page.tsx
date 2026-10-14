"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandWordmark } from "@/components/brand-mark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@tempempire.com");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/services",
    });
    setLoading(false);
    if (!res || res.error) {
      setError(res?.error === "CredentialsSignin" ? "Invalid email or password" : res?.error || "Sign-in failed");
      return;
    }
    // Prefer hard navigation so session cookie is picked up across hosts
    window.location.assign(res.url || "/services");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="panel panel-accent w-full max-w-md p-8 space-y-5 rise-in">
        <BrandWordmark />
        <div>
          <p className="eyebrow">Access</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
        </div>
        <p className="text-sm text-[var(--text-muted)] mono-data leading-relaxed">
          demo@tempempire.com / demo1234
          <br />
          admin@tempempire.com / admin1234
        </p>
        <div>
          <label className="text-sm text-[var(--text-muted)]">Email</label>
          <input
            className="input mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm text-[var(--text-muted)]">Password</label>
          <input
            className="input mt-1"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-[#fda4af]">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-sm text-[var(--text-muted)] text-center">
          No account?{" "}
          <Link href="/register" className="text-[var(--accent)]">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
