import Link from "next/link";
import type { Metadata } from "next";
import { BrandWordmark } from "@/components/brand-mark";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: absoluteTitle(PAGE_META.support.title),
  description: PAGE_META.support.description,
};

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@tempempire.store";

export default function SupportPage() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Temp Empire support")}`;

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-block mb-8">
          <BrandWordmark />
        </Link>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
          OTP website support
        </h1>
        <p className="mt-3 text-[var(--text-muted)] leading-relaxed">
          Questions about a US temp num, UK temp num, Facebook OTP code not received, Temp Mail
          Plus, or a WhatsApp deposit on 03072577778? Reach us directly — we reply during
          business hours.
        </p>

        <div className="panel panel-accent mt-8 p-6 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Email</div>
            <a href={mailto} className="mt-1 inline-block text-[var(--accent)] font-medium break-all">
              {SUPPORT_EMAIL}
            </a>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Hours</div>
            <p className="mt-1 text-sm text-[var(--text)]">Mon–Fri · 09:00–18:00 UTC</p>
            <p className="text-sm text-[var(--text-muted)]">Weekend messages answered next business day.</p>
          </div>
          <a href={mailto} className="btn btn-primary">
            Email support
          </a>
        </div>

        <form
          className="panel mt-6 p-6 space-y-4"
          action={mailto}
          method="get"
        >
          <p className="text-sm text-[var(--text-muted)]">
            Prefer a quick form? Fill this in — it opens your email app with the message ready.
          </p>
          <div>
            <label className="text-sm text-[var(--text-muted)]" htmlFor="subject">
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              className="input mt-1"
              defaultValue="Temp Empire support"
              required
            />
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)]" htmlFor="body">
              Message
            </label>
            <textarea
              id="body"
              name="body"
              className="input mt-1 min-h-[140px]"
              placeholder="Order ID, deposit hash, or what you need help with…"
              required
            />
          </div>
          <button type="submit" className="btn btn-ghost">
            Open mail draft
          </button>
        </form>

        <p className="mt-8 text-sm text-[var(--text-muted)]">
          <Link href="/" className="text-[var(--accent)]">
            ← Back home
          </Link>
        </p>
      </div>
    </div>
  );
}
