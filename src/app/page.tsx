"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Moon,
  Sun,
  Shield,
  Radio,
  Wallet,
  Globe2,
  Lock,
  Zap,
  Code2,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { BrandMark } from "@/components/brand-mark";
import { HeroEmblem } from "@/components/hero-emblem";

const ease = [0.22, 1, 0.36, 1] as const;

const features = [
  {
    k: "01",
    title: "Multi-country OTP",
    body: "Searchable catalogs, live stock, server pools across global routes.",
    icon: Radio,
  },
  {
    k: "02",
    title: "Live inbox",
    body: "SSE + polling for codes with auto-copy and countdown timers.",
    icon: Shield,
  },
  {
    k: "03",
    title: "Wallet first",
    body: "4-decimal balances, crypto webhooks, and manual deposit rails.",
    icon: Wallet,
  },
];

const steps = [
  { n: "01", t: "Fund wallet", d: "Top up with crypto or manual rails. Balance updates to four decimals." },
  { n: "02", t: "Pick route", d: "Choose country, service, and server pool with live stock indicators." },
  { n: "03", t: "Receive OTP", d: "Watch the live panel — SSE stream with polling fallback, then copy the code." },
];

const services = [
  "WhatsApp",
  "Telegram",
  "Google",
  "OpenAI",
  "Discord",
  "TikTok",
  "Instagram",
  "Binance",
];

const trusts = [
  { label: "Countries", value: "10+" },
  { label: "Services", value: "12+" },
  { label: "Server pools", value: "3" },
  { label: "API surface", value: "REST" },
];

const faqs = [
  {
    q: "Do I need a wholesale SMS account?",
    a: "No. Temp Empire sits on top of provider adapters. Locally it runs on mocks; production wires SMS-Activate, 5SIM, and peers via env.",
  },
  {
    q: "What happens if an OTP never arrives?",
    a: "Orders auto-refund on expiry with no code. Manual cancel within the first two minutes also returns credit.",
  },
  {
    q: "Can resellers automate purchases?",
    a: "Yes. API keys live in Settings. REST covers countries, services, purchase, OTP, cancel, and balance — with docs snippets.",
  },
  {
    q: "Is my balance safe?",
    a: "Wallet debits and credits run in Prisma transactions. Payment webhooks validate signatures before settling deposits.",
  },
];

const beats = ["verify", "activate", "scale"];

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease }}
      className="mb-10 max-w-2xl"
    >
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.035em]">{title}</h2>
      {body && <p className="mt-3 text-[var(--text-muted)] leading-relaxed">{body}</p>}
    </motion.div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      layout
      className="border-b border-[var(--border)]"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium tracking-tight">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={18} className="text-[var(--accent)]" />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-sm text-[var(--text-muted)] leading-relaxed max-w-2xl">{a}</p>
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage() {
  const { theme, toggle } = useTheme();
  const heroRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const emblemY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  // Tighter entrance timing on phones so the hero reads in order, not as a pile-up
  const d = (desktop: number, mobile = desktop * 0.45) => (isMobile ? mobile : desktop);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <motion.div
        className="pointer-events-none absolute top-[-20%] left-1/2 -translate-x-1/2 h-[420px] w-[min(100%,640px)] sm:h-[640px] sm:w-[900px] rounded-full bg-[radial-gradient(circle,var(--glow),transparent_68%)]"
        style={{ scale: glowScale }}
      />

      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex items-center gap-2.5"
        >
          <motion.div
            initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease }}
          >
            <BrandMark size={34} />
          </motion.div>
          <div className="leading-none">
            <motion.span
              className="block font-semibold tracking-[-0.03em] text-[1.1rem]"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.45 }}
            >
              temp empire
            </motion.span>
            <motion.span
              className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              verification OS
            </motion.span>
          </div>
        </motion.div>
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <button className="btn btn-ghost p-2" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/services" className="btn btn-primary">
            Open portal
          </Link>
        </motion.div>
      </header>

      {/* HERO — copy first on mobile; emblem below so sequence stays clear */}
      <section
        ref={heroRef}
        className="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-16 sm:pb-32 min-h-0 sm:min-h-[70vh] lg:min-h-[85vh]"
      >
        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-10">
          <div className="relative z-10 min-w-0 order-1">
            <div className="mb-6 sm:mb-10 flex items-center gap-3 sm:gap-4">
              <motion.div
                initial={{ scale: 0.2, opacity: 0, rotate: -120 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: d(0.85, 0.55), ease }}
                className="relative shrink-0"
              >
                <motion.div
                  className="absolute inset-[-10px] rounded-2xl bg-[var(--accent)] blur-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.45, 0.15] }}
                  transition={{ duration: 1.2, times: [0, 0.4, 1] }}
                />
                <BrandMark size={isMobile ? 48 : 64} />
              </motion.div>
              <div className="overflow-hidden">
                <motion.p
                  className="eyebrow"
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: d(0.45, 0.2), duration: 0.45, ease }}
                >
                  Temporary verification marketplace
                </motion.p>
              </div>
            </div>

            <h1 className="relative text-[2.65rem] leading-[0.98] sm:text-6xl lg:text-7xl xl:text-8xl font-semibold tracking-[-0.05em]">
              <span className="sr-only">temp empire</span>
              <span className="flex flex-wrap items-baseline gap-x-[0.28em] gap-y-1" aria-hidden>
                <span className="inline-flex whitespace-nowrap">
                  {"temp".split("").map((ch, i) => (
                    <motion.span
                      key={`t-${i}`}
                      className="inline-block"
                      initial={{ y: 48, opacity: 0, rotate: -6 }}
                      animate={{ y: 0, opacity: 1, rotate: 0 }}
                      transition={{ delay: d(0.55, 0.28) + i * 0.04, duration: 0.45, ease }}
                    >
                      {ch}
                    </motion.span>
                  ))}
                </span>
                <span className="inline-flex whitespace-nowrap text-[var(--accent)]">
                  {"empire".split("").map((ch, i) => (
                    <motion.span
                      key={`e-${i}`}
                      className="inline-block"
                      initial={{ y: 48, opacity: 0, filter: "blur(8px)" }}
                      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                      transition={{ delay: d(0.9, 0.42) + i * 0.04, duration: 0.45, ease }}
                    >
                      {ch}
                    </motion.span>
                  ))}
                </span>
              </span>
            </h1>

            <motion.p
              className="mt-5 sm:mt-7 max-w-lg text-[0.95rem] sm:text-lg text-[var(--text-muted)] leading-relaxed"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: d(1.35, 0.7), duration: 0.45, ease }}
            >
              Buy SMS OTP numbers across countries and services, spin up temp inboxes, and fund with
              crypto — one credit wallet, built like a product.
            </motion.p>

            <motion.div
              className="mt-7 sm:mt-9 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: d(1.5, 0.85), duration: 0.45, ease }}
            >
              <motion.div
                animate={
                  isMobile
                    ? undefined
                    : {
                        boxShadow: [
                          "0 0 0 0 var(--glow)",
                          "0 0 28px var(--glow)",
                          "0 0 0 0 var(--glow)",
                        ],
                      }
                }
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-full"
              >
                <Link href="/services" className="btn btn-primary">
                  Buy OTP <ArrowRight size={16} />
                </Link>
              </motion.div>
              <Link href="/api-docs" className="btn btn-ghost">
                Reseller API
              </Link>
            </motion.div>

            <motion.div
              className="mt-8 sm:mt-14 flex flex-wrap gap-2"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: {
                  transition: { staggerChildren: 0.1, delayChildren: d(1.65, 0.95) },
                },
              }}
            >
              {beats.map((b) => (
                <motion.span
                  key={b}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  className="mono-data rounded-full border border-[var(--hairline)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]"
                >
                  {b}
                </motion.span>
              ))}
            </motion.div>
          </div>

          <motion.div
            className="relative z-0 order-2 flex justify-center overflow-visible px-1 sm:px-2 lg:justify-end lg:pr-2"
            style={{ y: isMobile ? 0 : emblemY }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: d(0.95, 1.05), duration: 0.55, ease }}
            aria-hidden
          >
            <HeroEmblem compact={isMobile} />
          </motion.div>
        </div>

        <motion.div
          className="divider-neon mt-10 sm:mt-16"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.7 }}
          transition={{ delay: d(1.9, 1.2), duration: 0.7, ease }}
          style={{ originX: 0 }}
        />
      </section>

      {/* Trust / social proof */}
      <section className="relative z-10 border-y border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-elevated)_55%,transparent)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-14">
          <SectionHead
            eyebrow="Trust signals"
            title="Infrastructure tone, not marketing fluff."
            body="Numbers that reflect the product surface — routes, pools, and API — not invented vanity metrics."
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {trusts.map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45, ease }}
                className="panel panel-accent px-4 py-5"
              >
                <div className="mono-data text-2xl text-[var(--accent)]">{t.value}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{t.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <SectionHead
          eyebrow="How it works"
          title="Three beats from wallet to OTP."
          body="A linear path — fund, route, receive — with refunds if the code never lands."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.12, duration: 0.5, ease }}
              className="panel p-6 relative overflow-hidden"
            >
              <motion.div
                className="absolute left-0 top-0 h-full w-[2px] bg-[var(--accent)]"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
                style={{ originY: 0 }}
              />
              <div className="mono-data text-[var(--accent)] text-sm mb-3">{s.n}</div>
              <h3 className="text-xl font-semibold tracking-tight">{s.t}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Product pillars */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
        <SectionHead
          eyebrow="Operating system"
          title="Built for velocity, not dashboards."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.1, duration: 0.55, ease }}
                whileHover={{ y: -6 }}
                className="panel panel-accent p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="mono-data text-[11px] text-[var(--accent)]">{f.k}</span>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
                    <Icon size={18} />
                  </span>
                </div>
                <h3 className="font-semibold tracking-tight text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{f.body}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Featured services */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
        <SectionHead
          eyebrow="Featured services"
          title="Routes teams actually buy."
          body="WhatsApp to OpenAI — same purchase flow, dynamic pricing, stock badges."
        />
        <div className="flex flex-wrap gap-2">
          {services.map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.35, ease }}
              whileHover={{ scale: 1.04 }}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm"
            >
              <span className="text-[var(--accent)] mr-2">●</span>
              {name}
            </motion.div>
          ))}
        </div>
        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <Link href="/services" className="btn btn-ghost">
            Browse full catalog <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* Security */}
      <section className="relative z-10 border-y border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 grid gap-8 sm:gap-10 lg:grid-cols-[1fr_1.1fr] items-start">
          <SectionHead
            eyebrow="Security & privacy"
            title="Controls that belong in a fintech shell."
          />
          <div className="space-y-4">
            {[
              { icon: Lock, t: "Signed webhooks", d: "HMAC validation before deposit settlement." },
              { icon: Shield, t: "ACID wallet updates", d: "Interactive Prisma transactions for debit/credit." },
              { icon: Zap, t: "Rate-limited API", d: "Per-route RPM caps with X-RateLimit headers." },
              { icon: Globe2, t: "HttpOnly sessions", d: "Auth.js cookies; reseller keys for machine access." },
            ].map((item, i) => (
              <motion.div
                key={item.t}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45, ease }}
                className="flex gap-4 panel px-4 py-4"
              >
                <item.icon className="text-[var(--accent)] shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-medium">{item.t}</div>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{item.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <SectionHead
          eyebrow="Pricing"
          title="Pay per number. Markup you control."
          body="Dynamic offer prices with global markup. Cancel window and TTL are configurable."
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="panel panel-accent p-8 grid gap-6 md:grid-cols-2"
        >
          <div>
            <div className="mono-data text-[var(--accent)] text-sm mb-2">FROM</div>
            <div className="text-4xl font-semibold tracking-tight">
              $0.25<span className="text-lg text-[var(--text-muted)]"> / OTP</span>
            </div>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Demo seed pricing — production follows provider cost × markup.
            </p>
          </div>
          <ul className="space-y-3 text-sm">
            {[
              "Live stock & server pools",
              "Auto-refund on expiry",
              "Temp mail included",
              "Reseller REST API",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent)]" />
                {line}
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      {/* API / reseller */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease }}
          className="panel panel-accent relative overflow-hidden px-5 py-10 sm:px-12 sm:py-12"
        >
          <motion.div
            className="pointer-events-none absolute -right-8 -bottom-8 opacity-15"
            animate={{ rotate: [0, -15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          >
            <BrandMark size={180} />
          </motion.div>
          <div className="flex items-center gap-2 text-[var(--accent)] mb-3">
            <Code2 size={18} />
            <span className="eyebrow !mb-0">Reseller API</span>
          </div>
          <h2 className="max-w-lg text-3xl sm:text-4xl font-semibold tracking-[-0.035em]">
            Automate purchases with a single API key.
          </h2>
          <p className="mt-3 max-w-md text-[var(--text-muted)] text-sm leading-relaxed">
            Countries, services, purchase, OTP, cancel, balance — cURL, Python, JS, and PHP samples on
            the docs page.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/api-docs" className="btn btn-primary">
              Read API docs <ArrowRight size={16} />
            </Link>
            <Link href="/register" className="btn btn-ghost">
              Create account
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
        <SectionHead eyebrow="FAQ" title="Straight answers." />
        <div className="panel px-6">
          {faqs.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center py-16"
        >
          <p className="eyebrow mb-4">Start now</p>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.04em]">
            Enter the portal.
          </h2>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link href="/services" className="btn btn-primary">
              Launch services <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn btn-ghost">
              Sign in
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <BrandMark size={28} />
              <span className="font-semibold tracking-tight">temp empire</span>
            </div>
            <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">
              Self-service temporary verification — SMS OTP, temp mail, wallet credits.
            </p>
          </div>
          <div>
            <div className="mono-data text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">
              Product
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/services" className="hover:text-[var(--accent)]">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/temp-mail" className="hover:text-[var(--accent)]">
                  Temp mail
                </Link>
              </li>
              <li>
                <Link href="/deposit" className="hover:text-[var(--accent)]">
                  Deposit
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="mono-data text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">
              Developers
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/api-docs" className="hover:text-[var(--accent)]">
                  API docs
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-[var(--accent)]">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[var(--accent)]">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="divider-neon opacity-40" />
        <div className="mx-auto max-w-6xl px-6 py-5 flex flex-wrap justify-between gap-2 mono-data text-[10px] text-[var(--text-muted)] uppercase tracking-[0.14em]">
          <span>© {new Date().getFullYear()} Temp Empire</span>
          <span>Verification OS · v0.1</span>
        </div>
      </footer>
    </div>
  );
}
