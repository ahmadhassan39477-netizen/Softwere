import Link from "next/link";
import type { Metadata } from "next";
import { BrandWordmark } from "@/components/brand-mark";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: absoluteTitle(PAGE_META.mail.title),
  description: PAGE_META.mail.description,
  alternates: { canonical: "https://www.tempempire.store/mail" },
  openGraph: {
    title: PAGE_META.mail.title,
    description: PAGE_META.mail.description,
    url: "https://www.tempempire.store/mail",
    type: "website",
    siteName: "Temp Empire",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META.mail.title,
    description: PAGE_META.mail.description,
  },
};

const faqs = [
  {
    q: "Is this like Temp Mail Plus?",
    a: "Yes — Temp Empire includes Temp Mail Plus-style disposable email: create a free alias after you sign in and read messages in a live inbox.",
  },
  {
    q: "Is the alias free?",
    a: "Generating a Temp Mail Plus-style address is free on your account. Temporary phone numbers for SMS OTP are paid from your wallet.",
  },
  {
    q: "Do I need to sign up?",
    a: "Yes. Sign in to generate an address. The same account buys a US temp num, UK temp num, or temp num Canada for SMS OTP.",
  },
];

export default function TempMailPlusPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/">
          <BrandWordmark compact />
        </Link>
        <Link href="/register?callbackUrl=%2Ftemp-mail" className="btn btn-primary text-sm">
          Sign up for Temp Mail
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <p className="eyebrow">Disposable email · Temp Mail Plus</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.035em] leading-tight">
          Temp Mail Plus-style free disposable email
        </h1>
        <div className="mt-8 space-y-5 text-[var(--text-muted)] leading-relaxed text-[0.98rem]">
          <p>
            Need an inbox that is not your personal Gmail? Temp Empire includes Temp Mail
            Plus-style temporary email: one-click aliases and a live inbox, on the same SMS OTP
            website you use for a US temp num, UK temp num, or temp num Canada.
          </p>
          <p>
            Create an account, open Temp Mail, generate a free address, and watch messages arrive.
            Use it for signups where you would rather not publish your real email — alongside a
            private temp number when an app also wants SMS.
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text)] pt-2">
            Temp Mail Plus on this OTP website
          </h2>
          <p>
            Public “temp num free” SMS walls share codes with everyone. Email aliases here stay on
            your account after you sign in. Pair Temp Mail Plus with Facebook OTP verification or
            an OTP website for WhatsApp flow when you need both email and SMS.
          </p>
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">FAQ</h2>
          <dl className="mt-6 space-y-5">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-medium">{f.q}</dt>
                <dd className="mt-1.5 text-sm text-[var(--text-muted)] leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/register?callbackUrl=%2Ftemp-mail" className="btn btn-primary">
            Sign up to open Temp Mail
          </Link>
          <Link href="/buy/usa" className="btn btn-ghost">
            US temp num
          </Link>
          <Link href="/buy/uk" className="btn btn-ghost">
            UK temp num
          </Link>
        </div>
      </article>
    </div>
  );
}
