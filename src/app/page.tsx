"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Moon, Sun, Zap } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function LandingPage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[480px] w-[900px] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_35%,transparent),transparent_70%)] blur-2xl" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent-2)_30%,transparent),transparent_70%)] blur-2xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
            <Zap size={18} />
          </span>
          Temp Empire
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost p-2" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/login" className="btn btn-ghost">
            Sign in
          </Link>
          <Link href="/services" className="btn btn-primary">
            Open portal
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="max-w-3xl"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-2)]">
            Temporary verification marketplace
          </p>
          <h1 className="text-5xl sm:text-6xl font-bold leading-[1.05] tracking-tight">
            Temp Empire
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--text-muted)]">
            Buy SMS OTP numbers across countries and services, spin up temp inboxes, and fund with
            crypto — all on one credit wallet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/services" className="btn btn-primary">
              Buy OTP <ArrowRight size={16} />
            </Link>
            <Link href="/api-docs" className="btn btn-ghost">
              Reseller API
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-20 grid gap-4 sm:grid-cols-3"
        >
          {[
            { title: "Multi-country OTP", body: "Searchable catalogs, live stock, server pools." },
            { title: "Live inbox", body: "SSE + polling for codes with auto-copy and countdown." },
            { title: "Wallet first", body: "4-decimal balances, crypto webhooks, manual deposits." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="panel p-5"
            >
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
