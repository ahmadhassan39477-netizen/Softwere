"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Zap } from "lucide-react";

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
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/services");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="panel w-full max-w-md p-8 space-y-5">
        <div className="flex items-center gap-2 font-bold text-xl">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
            <Zap size={18} />
          </span>
          Temp Empire
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Demo: demo@tempempire.com / demo1234 · Admin: admin@tempempire.com / admin1234
        </p>
        <div>
          <label className="text-sm text-[var(--text-muted)]">Email</label>
          <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
        {error && <p className="text-sm text-[#fca5a5]">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-sm text-[var(--text-muted)] text-center">
          No account?{" "}
          <Link href="/register" className="text-[var(--accent-2)]">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
