import type { Metadata } from "next";
import Link from "next/link";
import { PublicChrome } from "@/components/public-chrome";
import { REGISTER_SERVICES } from "@/lib/guest-links";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: absoluteTitle(PAGE_META.about.title),
  description: PAGE_META.about.description,
  alternates: { canonical: "https://www.tempempire.store/about" },
};

export default function AboutPage() {
  return (
    <PublicChrome>
      <article className="mx-auto max-w-2xl space-y-6">
        <p className="eyebrow">About</p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          A small shop for private temporary numbers
        </h1>
        <p className="text-[var(--text-muted)] leading-relaxed">
          Temp Empire sells private temporary phone numbers so you can receive an SMS code, plus
          disposable email after you sign in. We are an independent website — not a phone carrier,
          bank, or household-name OTP brand.
        </p>
        <p className="text-[var(--text-muted)] leading-relaxed">
          First visit is simple: create an account, message us on WhatsApp, we add credit, then buy
          a number on Services and copy the code from your inbox.
        </p>
        <ol className="panel p-5 space-y-3 text-sm leading-relaxed">
          <li>
            <strong>1. Sign up</strong> — email and password. Guests cannot buy OTP.
          </li>
          <li>
            <strong>2. Deposit</strong> — after you sign in, message us on WhatsApp with your
            account email and amount. Credit appears after we confirm payment.
          </li>
          <li>
            <strong>3. Buy</strong> — pick a country and app on Services. If SMS never arrives,
            eligible orders refund to your wallet.
          </li>
        </ol>
        <p className="text-[var(--text-muted)] leading-relaxed">
          Use numbers for legitimate verification and privacy. Follow each app’s own rules. We do
          not help anyone evade security checks, and we do not publish a public shared-code wall.
        </p>
        <p className="text-[var(--text-muted)] leading-relaxed">
          Questions:{" "}
          <Link href="/support" className="text-[var(--accent)]">
            Contact
          </Link>
          {" "}
          or email{" "}
          <a href="mailto:support@tempempire.store" className="text-[var(--accent)]">
            support@tempempire.store
          </a>
          . Legal:{" "}
          <Link href="/privacy" className="text-[var(--accent)]">
            Privacy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-[var(--accent)]">
            Terms
          </Link>
          .
        </p>
        <Link href={REGISTER_SERVICES} className="btn btn-primary inline-flex">
          Sign up to start
        </Link>
      </article>
    </PublicChrome>
  );
}
