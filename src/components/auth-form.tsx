"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    const password = String(data.get("password"));
    if (mode === "signup") {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email, password }),
      });
      if (!response.ok) {
        setError((await response.json()).error);
        setLoading(false);
        return;
      }
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Email or password is incorrect.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="card w-full max-w-md p-8">
      <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-2 text-sm text-slate-500">{mode === "login" ? "Log in to manage your listings." : "Start with the free plan. No card required."}</p>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        {mode === "signup" && <label><span className="label">Name</span><input className="input" name="name" required minLength={2} autoComplete="name" /></label>}
        <label><span className="label">Email</span><input className="input" name="email" type="email" required autoComplete="email" /></label>
        <label><span className="label">Password</span><input className="input" name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <Link className="font-semibold text-brand-700 hover:underline" href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Sign up" : "Log in"}</Link>
      </p>
    </div>
  );
}
