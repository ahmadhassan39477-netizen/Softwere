"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { BrandMark, BrandWordmark } from "@/components/brand-mark";

export default function LandingPage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[520px] w-[720px] rounded-full bg-[radial-gradient(circle,var(--glow),transparent_68%)]" />
        <motion.div
          className="absolute right-[-40px] top-28 opacity-[0.14] sm:right-16 sm:opacity-25"
          animate={{ rotate: 360 }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        >
          <BrandMark size={220} />
        </motion.div>
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandWordmark />
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost p-2" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/services" className="btn btn-primary">
            Open portal
          </Link>
        </div>
      </header>

      <div className="divider-neon mx-auto max-w-6xl animate-[pulse-line_3.2s_ease-in-out_infinite]" />

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-28 pt-16 sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl"
        >
          <p className="eyebrow mb-5">Temporary verification marketplace</p>
          <h1 className="text-5xl sm:text-7xl font-semibold leading-[0.98] tracking-[-0.045em]">
            temp
            <span className="text-[var(--accent)]"> empire</span>
          </h1>
          <p className="mt-6 max-w-lg text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
            Buy SMS OTP numbers across countries and services, spin up temp inboxes, and fund with
            crypto — one credit wallet, built like a product.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/services" className="btn btn-primary">
              Buy OTP <ArrowRight size={16} />
            </Link>
            <Link href="/api-docs" className="btn btn-ghost">
              Reseller API
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.55 }}
          className="mt-20 grid gap-4 sm:grid-cols-3"
        >
          {[
            { k: "01", title: "Multi-country OTP", body: "Searchable catalogs, live stock, server pools." },
            { k: "02", title: "Live inbox", body: "SSE + polling for codes with auto-copy and countdown." },
            { k: "03", title: "Wallet first", body: "4-decimal balances, crypto webhooks, manual deposits." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 + i * 0.08 }}
              className="panel panel-accent p-5"
            >
              <div className="mono-data text-[11px] text-[var(--accent)] mb-3">{f.k}</div>
              <h3 className="font-semibold tracking-tight text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
