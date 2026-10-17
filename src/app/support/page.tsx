import Link from "next/link";
import type { Metadata } from "next";
import { PublicChrome } from "@/components/public-chrome";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: absoluteTitle(PAGE_META.support.title),
  description: PAGE_META.support.description,
  alternates: { canonical: "https://www.tempempire.store/support" },
};

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@tempempire.store";

export default function SupportPage() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Temp Empire support")}`;

  return (
    <PublicChrome>
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
          Talk to a person
        </h1>
        <p className="mt-3 text-[var(--text-muted)] leading-relaxed">
          Deposits, missing SMS, or account help — message WhatsApp{" "}
          <span className="mono-data text-[var(--text)]">03072577778</span> or email us. We reply
          during business hours.
        </p>

        <div className="panel panel-accent mt-8 p-6 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
              WhatsApp (deposits + help)
            </div>
            <a
              href="https://wa.me/923072577778"
              className="mt-1 inline-block text-[var(--accent)] font-medium mono-data"
              rel="noopener noreferrer"
            >
              03072577778
            </a>
            <p className="text-sm text-[var(--text-muted)] mt-1">That number only.</p>
          </div>
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
          <div className="flex flex-wrap gap-3">
            <a href="https://wa.me/923072577778" className="btn btn-primary" rel="noopener noreferrer">
              Open WhatsApp
            </a>
            <a href={mailto} className="btn btn-ghost">
              Email support
            </a>
          </div>
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
          <Link href="/privacy" className="text-[var(--accent)]">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="text-[var(--accent)]">
            Terms
          </Link>
          {" · "}
          <Link href="/" className="text-[var(--accent)]">
            Home
          </Link>
        </p>
      </div>
    </PublicChrome>
  );
}
