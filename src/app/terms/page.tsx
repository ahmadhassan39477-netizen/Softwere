import type { Metadata } from "next";
import Link from "next/link";
import { PublicChrome } from "@/components/public-chrome";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: absoluteTitle(PAGE_META.terms.title),
  description: PAGE_META.terms.description,
  alternates: { canonical: "https://www.tempempire.store/terms" },
};

export default function TermsPage() {
  return (
    <PublicChrome>
      <article className="mx-auto max-w-2xl space-y-6">
        <p className="eyebrow">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Terms of Use</h1>
        <p className="text-sm text-[var(--text-muted)]">Last updated: 17 October 2026</p>
        <p className="text-[var(--text-muted)] leading-relaxed">
          By using Temp Empire at{" "}
          <span className="mono-data">https://www.tempempire.store</span> you agree to these
          terms. If you do not agree, do not create an account or buy a number.
        </p>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">The service</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            We rent private temporary numbers so you can receive an SMS code, and we offer
            disposable email after sign-in. Stock, price, and delivery time can change. We are not
            a telecom carrier and we do not guarantee that every app will accept every number.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Accounts and payment</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            You must create an account before buying OTP. Wallet credit is added after you pay via
            WhatsApp <span className="mono-data">03072577778</span> only — nothing is charged
            automatically. Keep your password private. You are responsible for activity on your
            account.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Allowed use</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Use numbers for legitimate verification and privacy. Follow the destination app’s own
            terms. Do not use Temp Empire to harass anyone, commit fraud, evade a ban, or break the
            law. We may suspend accounts that abuse the service.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Refunds</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            If an SMS never arrives, eligible orders refund to your wallet so you can try again.
            Unused wallet credit after a WhatsApp deposit is handled case by case via{" "}
            <Link href="/support" className="text-[var(--accent)]">
              Contact
            </Link>
            .
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Email{" "}
            <a href="mailto:support@tempempire.store" className="text-[var(--accent)]">
              support@tempempire.store
            </a>{" "}
            or WhatsApp 03072577778. Privacy details are on the{" "}
            <Link href="/privacy" className="text-[var(--accent)]">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </article>
    </PublicChrome>
  );
}
