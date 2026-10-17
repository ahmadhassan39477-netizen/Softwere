import type { Metadata } from "next";
import Link from "next/link";
import { PublicChrome } from "@/components/public-chrome";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: absoluteTitle(PAGE_META.privacy.title),
  description: PAGE_META.privacy.description,
  alternates: { canonical: "https://www.tempempire.store/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicChrome>
      <article className="mx-auto max-w-2xl space-y-6">
        <p className="eyebrow">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-[var(--text-muted)]">Last updated: 17 October 2026</p>
        <p className="text-[var(--text-muted)] leading-relaxed">
          This page explains what Temp Empire collects when you use{" "}
          <span className="mono-data">https://www.tempempire.store</span>. We sell private
          temporary numbers and disposable email. We do not sell your personal information.
        </p>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">What we collect</h2>
          <ul className="list-disc pl-5 text-sm text-[var(--text-muted)] space-y-2 leading-relaxed">
            <li>Account name, email, and a hashed password when you sign up.</li>
            <li>Wallet amounts, deposit messages you send us, and order history (number, app, status, OTP when it arrives).</li>
            <li>Technical logs such as IP address, browser type, and pages requested — used to keep the site running and stop abuse.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">How we use it</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            We use this data to create your account, credit your wallet after a WhatsApp payment,
            issue a temporary number, show the SMS in your inbox, and answer support questions. We
            do not use your data to build public “free OTP” lists.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Who else sees it</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Hosting, database, and routing partners process data only to run the shop. Support
            staff see what they need to credit a wallet or fix an order. We do not sell lists of
            emails or phone numbers.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">How long we keep it</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Account and wallet records stay while your account is open. You can email us to close
            an account. We may keep a short record of transactions where the law or chargebacks
            require it.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Email{" "}
            <a href="mailto:support@tempempire.store" className="text-[var(--accent)]">
              support@tempempire.store
            </a>{" "}
            or WhatsApp 03072577778. See also{" "}
            <Link href="/terms" className="text-[var(--accent)]">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/support" className="text-[var(--accent)]">
              Contact
            </Link>
            .
          </p>
        </section>
      </article>
    </PublicChrome>
  );
}
