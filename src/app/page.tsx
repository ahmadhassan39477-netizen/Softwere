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
  Globe,
  Mail,
  Lock,
  Zap,
  Code2,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "@/components/theme-provider";
import { BrandMark } from "@/components/brand-mark";
import { HeroEmblem } from "@/components/hero-emblem";
import {
  CATALOG_SERVICES,
  HOW_IT_WORKS,
  MARKETPLACE_FACTS,
  PRODUCT_PILLARS,
  SERVER_POOLS,
} from "@/lib/catalog-content";
import { ServiceLogo } from "@/components/service-logo";
import { SiteFooter } from "@/components/site-footer";
import { TrustFacts } from "@/components/trust-facts";
import {
  REGISTER_API,
  REGISTER_CANADA,
  REGISTER_FACEBOOK,
  REGISTER_SERVICES,
  REGISTER_UK,
  REGISTER_USA,
  shopHref,
} from "@/lib/guest-links";

const ease = [0.22, 1, 0.36, 1] as const;

const pillarIcons = [Radio, Shield, Wallet] as const;

const faqs = [
  {
    q: "Is this an SMS OTP website for a US temp num and UK temp num?",
    a: "Yes. Temp Empire is an OTP website where you buy a US temp num, UK temp num, or temp num Canada after signup, then read SMS in a private inbox.",
  },
  {
    q: "Do you have a temp num free or a free virtual number OTP website?",
    a: "Public “temp num free” walls share codes with everyone. We sell a private temp number from your wallet. Temp Mail Plus-style email aliases are free after you sign in.",
  },
  {
    q: "Can I get Facebook OTP verification here?",
    a: "Yes. Buy a Facebook OTP number (US, UK, or Canada), request the SMS from Facebook, and read your own Facebook OTP. We do not post a Facebook OTP code free list, and we do not help anyone skip Facebook’s checks.",
  },
  {
    q: "Facebook OTP code not received — what happens?",
    a: "Watch the live panel. If the Facebook OTP never arrives, eligible orders refund to your wallet so you can try another verification phone number.",
  },
  {
    q: "Is this an OTP website for WhatsApp?",
    a: "Yes. After you sign up, pick a UK, USA, or Canada temp number for WhatsApp OTP and copy the code from your inbox.",
  },
  {
    q: "What is Temp Mail Plus on Temp Empire?",
    a: "Disposable email in the same account: generate a free alias and read real mail in a live inbox — Temp Mail Plus, next to your temp OTP website numbers. Wallet credit is not required for email.",
  },
  {
    q: "Do you offer VPN and proxy?",
    a: "Yes — VPN & Proxy sits on the same account as OTP and Temp Mail Plus. We do not show a fake connected tunnel. Plans go live when a provider is saved in Admin.",
  },
  {
    q: "How do I pay?",
    a: "Sign up, then message us on WhatsApp from the Deposit page. After we confirm payment, buy a temp number from Services.",
  },
];

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

function PlusOfferCards() {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const mailHref = shopHref(signedIn, "/temp-mail");
  const vpnHref = shopHref(signedIn, "/vpn");

  const offers = [
    {
      href: mailHref,
      eyebrow: "Free on your account",
      title: "Temp Mail Plus",
      body: "Generate a real disposable address, copy it, and read incoming mail. Wallet credit is not required — email is not SMS.",
      cta: "Temp Mail Plus",
      icon: Mail,
    },
    {
      href: vpnHref,
      eyebrow: "Honest status",
      title: "VPN & Proxy",
      body: "Datacenter proxy, residential proxy, and VPN config on the same account. We never show a fake connected tunnel.",
      cta: "VPN & Proxy",
      icon: Globe,
    },
  ] as const;

  return (
    <section
      id="plus-products"
      className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pb-4 sm:pb-8"
    >
      <SectionHead
        eyebrow="Same account as OTP"
        title="Temp Mail Plus and VPN & Proxy."
        body="Private numbers for SMS, a free inbox for email, and VPN & Proxy next to them — one signup."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {offers.map((offer, i) => {
          const Icon = offer.icon;
          return (
            <motion.div
              key={offer.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.12, duration: 0.55, ease }}
              whileHover={{ y: -8 }}
              className="group relative"
            >
              <div
                className="pointer-events-none absolute -inset-px rounded-[1.35rem] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(circle at 20% 0%, color-mix(in oklab, var(--accent) 35%, transparent), transparent 55%)",
                }}
                aria-hidden
              />
              <Link
                href={offer.href}
                className="panel panel-accent relative block overflow-hidden p-6 sm:p-7"
              >
                <motion.span
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--accent)_18%,transparent)] to-transparent"
                  initial={{ x: "-20%", opacity: 0 }}
                  whileInView={{ x: "320%", opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.35 + i * 0.1, duration: 1.1, ease }}
                  aria-hidden
                />
                <div className="flex items-start justify-between gap-3">
                  <p className="eyebrow !mb-0">{offer.eyebrow}</p>
                  <motion.span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-[var(--accent)]"
                    whileHover={{ rotate: -8, scale: 1.06 }}
                    transition={{ type: "spring", stiffness: 380, damping: 22 }}
                  >
                    <Icon size={20} />
                  </motion.span>
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{offer.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{offer.body}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)]">
                  {offer.cta}
                  <motion.span
                    className="inline-flex"
                    initial={{ x: 0 }}
                    whileHover={{ x: 4 }}
                  >
                    <ArrowRight size={16} />
                  </motion.span>
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
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
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const mailHref = shopHref(signedIn, "/temp-mail");
  const vpnHref = shopHref(signedIn, "/vpn");
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

      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 sm:gap-2.5"
          aria-label="Temp Empire home"
        >
          <BrandMark size={32} priority />
          <span className="min-w-0 truncate font-semibold tracking-[-0.035em] text-[1.05rem] sm:text-[1.1rem] leading-none">
            <span className="text-[var(--text)]">temp </span>
            <span className="text-[var(--accent)]">empire</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button className="btn btn-ghost p-2 shrink-0" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/about" className="btn btn-ghost !hidden md:!inline-flex">
            About
          </Link>
          <Link href="/login?callbackUrl=/services" className="btn btn-ghost !hidden md:!inline-flex">
            Sign in
          </Link>
          <Link
            href={REGISTER_SERVICES}
            className="btn btn-primary shrink-0 whitespace-nowrap text-sm !px-3 !min-h-10 sm:!px-4"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* HERO — copy first on mobile; emblem below so sequence stays clear */}
      <section
        ref={heroRef}
        className="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-16 sm:pb-32 min-h-0 sm:min-h-[70vh] lg:min-h-[85vh]"
      >
        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-10">
          <div className="relative z-10 min-w-0 order-1">
            <div className="mb-6 sm:mb-10 flex items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div
                  className="absolute inset-[-10px] rounded-2xl bg-[var(--accent)] blur-xl opacity-20"
                  aria-hidden
                />
                <BrandMark size={isMobile ? 48 : 64} priority />
              </div>
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

            <div className="relative text-[2.65rem] leading-[0.98] sm:text-6xl lg:text-7xl xl:text-8xl font-semibold tracking-[-0.05em]">
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
            </div>

            <h1 className="mt-5 sm:mt-6 text-xl sm:text-2xl lg:text-3xl font-semibold tracking-[-0.03em] leading-tight max-w-xl">
              US &amp; UK temp number — SMS OTP website
            </h1>

            <motion.p
              className="mt-4 sm:mt-5 max-w-lg text-[0.95rem] sm:text-lg text-[var(--text-muted)] leading-relaxed"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: d(1.35, 0.7), duration: 0.45, ease }}
            >
              Private US and UK temporary numbers for receiving SMS. Sign up, message us on
              WhatsApp, we add credit, then buy — not a public shared inbox. Same account:
              Temp Mail Plus and VPN & Proxy.
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
                <Link href={REGISTER_SERVICES} className="btn btn-primary">
                  Sign up to buy <ArrowRight size={16} />
                </Link>
              </motion.div>
              <a href="#how-it-works" className="btn btn-ghost">
                How first buy works
              </a>
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
              {[
                { label: "US temp num", href: REGISTER_USA },
                { label: "UK temp num", href: REGISTER_UK },
                { label: "OTP website", href: REGISTER_SERVICES },
                { label: "Temp Mail Plus", href: mailHref },
                { label: "VPN & Proxy", href: vpnHref },
              ].map((b) => (
                <motion.span
                  key={b.label}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  whileHover={{ y: -3, scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 400, damping: 24 }}
                >
                  <Link
                    href={b.href}
                    className="mono-data inline-flex rounded-full border border-[var(--hairline)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--accent)] shadow-[0_0_0_0_transparent] transition-shadow hover:shadow-[0_0_18px_var(--glow)]"
                  >
                    {b.label}
                  </Link>
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

        <motion.ol
          className="mt-8 grid gap-3 sm:grid-cols-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: d(2.0, 1.25), duration: 0.45, ease }}
          aria-label="First-time buyer path"
        >
          {[
            { n: "1", t: "Sign up", d: "Email and password." },
            { n: "2", t: "Deposit", d: "Message us on WhatsApp. We add credit." },
            { n: "3", t: "Buy", d: "Services → number → OTP." },
          ].map((step) => (
            <li key={step.n} className="panel px-4 py-3 flex gap-3 items-start">
              <span className="mono-data text-[var(--accent)] text-sm mt-0.5">{step.n}</span>
              <span>
                <span className="font-medium">{step.t}</span>
                <span className="block text-sm text-[var(--text-muted)]">{step.d}</span>
              </span>
            </li>
          ))}
        </motion.ol>
      </section>

      <PlusOfferCards />

      {/* Marketplace facts */}
      <section className="relative z-10 border-y border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-elevated)_55%,transparent)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-14">
          <SectionHead
            eyebrow="Marketplace facts"
            title="Real catalog numbers — not vanity stats."
            body="200+ countries, dozens of apps, three pools, and automatic refunds if a code never arrives."
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
            {MARKETPLACE_FACTS.map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45, ease }}
                whileHover={{ y: -4 }}
                className="panel panel-accent px-4 py-5"
              >
                <div className="mono-data text-2xl sm:text-3xl text-[var(--accent)]">{t.value}</div>
                <div className="mt-1 text-sm font-medium">{t.label}</div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">{t.hint}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <SectionHead
          eyebrow="How it works"
          title="Sign up, deposit, then buy."
          body="First-time path: create an account, message us on WhatsApp, we add credit, then buy a number on Services. Eligible orders refund if SMS never arrives."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {HOW_IT_WORKS.map((s, i) => (
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
          eyebrow="Product"
          title="Everything you need to verify at speed."
          body="Catalog, live inbox, and wallet — built for operators and resellers, not slideware."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {PRODUCT_PILLARS.map((f, i) => {
            const Icon = pillarIcons[i] ?? Radio;
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

      {/* Featured services — rich catalog cards */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
        <SectionHead
          eyebrow="Service catalog"
          title="Facebook OTP, WhatsApp, and more apps."
          body="Buy a temp number for the apps you already use. Live stock updates in the portal after you sign in."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATALOG_SERVICES.map((svc, i) => (
            <motion.div
              key={svc.name}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: (i % 4) * 0.06, duration: 0.4, ease }}
              whileHover={{ y: -5, borderColor: "var(--accent)" }}
              className="panel panel-accent p-4 flex flex-col gap-3"
            >
              <Link href={REGISTER_SERVICES} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <ServiceLogo slug={svc.slug} name={svc.name} />
                  <div className="min-w-0">
                    <div className="font-semibold tracking-tight truncate">{svc.name}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{svc.category}</div>
                  </div>
                </div>
                <span className="badge badge-success shrink-0">Live</span>
              </div>
              <div className="mono-data text-[var(--accent)] text-lg">
                from ${svc.from}
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{svc.note}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-8 grid gap-3 sm:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1 } },
          }}
        >
          {SERVER_POOLS.map((p) => (
            <motion.div
              key={p.id}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              className="rounded-xl border border-[var(--border)] px-4 py-3"
            >
              <div className="mono-data text-[11px] text-[var(--accent)]">{p.label}</div>
              <div className="font-medium mt-1">{p.title}</div>
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{p.blurb}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <Link href={REGISTER_SERVICES} className="btn btn-primary">
            Sign up, then deposit <ArrowRight size={16} />
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
              { icon: Lock, t: "WhatsApp deposit", d: "Wallet credit after we confirm your WhatsApp payment — nothing auto-charges." },
              { icon: Shield, t: "Safe wallet charges", d: "Your balance is deducted only after a number is successfully issued." },
              { icon: Zap, t: "Abuse-resistant API", d: "Rate limits protect accounts and reseller keys." },
              { icon: Globe2, t: "Secure sign-in", d: "Email and password only — sessions stay on your device." },
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
          body="Pay per number from your wallet. Cancel early or get an auto-refund if SMS never arrives."
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

      {/* Honest trust — no fake named reviews */}
      <section className="relative z-10 border-y border-[var(--border)] py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead
            eyebrow="Trust"
            title="What you can actually expect."
            body="We are an independent shop, not a household-name carrier. Written Privacy and Terms, a real contact path, and refunds when SMS never arrives."
          />
          <TrustFacts />
        </div>
      </section>

      {/* API / reseller — developer surface; jargon stays here + /api-docs */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
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
            <span className="eyebrow !mb-0">For developers</span>
          </div>
          <h2 className="max-w-lg text-3xl sm:text-4xl font-semibold tracking-[-0.035em]">
            Automate purchases with a single API key.
          </h2>
          <p className="mt-3 max-w-md text-[var(--text-muted)] text-sm leading-relaxed">
            Reseller REST for countries, services, purchase, OTP, cancel, and balance — including SSE
            and polling patterns documented on the API page.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={REGISTER_API} className="btn btn-primary">
              Read API docs <ArrowRight size={16} />
            </Link>
            <Link href={REGISTER_SERVICES} className="btn btn-ghost">
              Create account
            </Link>
          </div>
        </motion.div>
      </section>

      {/* UK / USA / Canada SEO hubs */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-20">
        <SectionHead
          eyebrow="Top markets"
          title="US temp num, UK temp num, and Canada."
          body="Temp number routes for this OTP website — private +1 and +44 SMS, not a public temp num free wall."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href={REGISTER_USA}
            className="panel panel-accent p-6 block hover:border-[var(--accent)] transition-colors"
          >
            <p className="eyebrow !mb-2">🇺🇸 United States</p>
            <h3 className="text-xl font-semibold tracking-tight">US temp num (+1)</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              Temp num USA for Facebook OTP, WhatsApp OTP, and receive SMS online — buy after
              signup and a WhatsApp deposit.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)]">
              USA number guides <ArrowRight size={14} />
            </span>
          </Link>
          <Link
            href={REGISTER_UK}
            className="panel panel-accent p-6 block hover:border-[var(--accent)] transition-colors"
          >
            <p className="eyebrow !mb-2">🇬🇧 United Kingdom</p>
            <h3 className="text-xl font-semibold tracking-tight">UK temp num (+44)</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              UK temp number for WhatsApp OTP, Facebook OTP verification, and SMS online — guides
              then live buy after signup.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)]">
              UK number guides <ArrowRight size={14} />
            </span>
          </Link>
          <Link
            href={REGISTER_CANADA}
            className="panel panel-accent p-6 block hover:border-[var(--accent)] transition-colors"
          >
            <p className="eyebrow !mb-2">🇨🇦 Canada</p>
            <h3 className="text-xl font-semibold tracking-tight">Temp num Canada</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              Canada temporary number for WhatsApp OTP, Facebook OTP, and other apps — same
              private inbox as US and UK.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)]">
              Canada number guides <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-20">
        <SectionHead
          eyebrow="Popular checks"
          title="Facebook OTP and OTP website for WhatsApp."
          body="Receive SMS on a private temp number. We do not publish a Facebook OTP code free list."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href={REGISTER_FACEBOOK}
            className="panel panel-accent p-6 block hover:border-[var(--accent)] transition-colors"
          >
            <h3 className="text-xl font-semibold tracking-tight">Facebook OTP verification</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              Facebook OTP number and verification phone number on a US temp num. If the Facebook
              OTP code is not received, eligible orders refund.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)]">
              Facebook OTP (USA) <ArrowRight size={14} />
            </span>
          </Link>
          <Link
            href={REGISTER_UK}
            className="panel panel-accent p-6 block hover:border-[var(--accent)] transition-colors"
          >
            <h3 className="text-xl font-semibold tracking-tight">OTP website for WhatsApp</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              Rent a UK temp num, request the WhatsApp SMS yourself, and copy the code from your
              inbox — a temp OTP website, not a shared wall.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)]">
              WhatsApp UK guide <ArrowRight size={14} />
            </span>
          </Link>
          <Link
            href={mailHref}
            className="panel panel-accent p-6 block hover:border-[var(--accent)] transition-colors"
          >
            <h3 className="text-xl font-semibold tracking-tight">Temp Mail Plus</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              Temp Mail Plus free disposable email on the same account as your temp number.
              Sign in to generate a real inbox. Wallet credit is not required for email.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)]">
              Temp Mail Plus <ArrowRight size={14} />
            </span>
          </Link>
          <Link
            href={vpnHref}
            className="panel panel-accent p-6 block hover:border-[var(--accent)] transition-colors"
          >
            <h3 className="text-xl font-semibold tracking-tight">VPN & Proxy</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              Datacenter and residential proxies plus VPN config on the same account. We do not
              show a fake connected tunnel.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)]">
              VPN & Proxy <ArrowRight size={14} />
            </span>
          </Link>
        </div>
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
            <Link href={REGISTER_SERVICES} className="btn btn-primary">
              Sign up to start <ArrowRight size={16} />
            </Link>
            <Link href="/login?callbackUrl=/services" className="btn btn-ghost">
              Sign in
            </Link>
          </div>
        </motion.div>
      </section>

      <SiteFooter />
    </div>
  );
}
