import type { Metadata } from "next";
import Link from "next/link";
import { GuideBreadcrumb } from "@/components/guide-breadcrumb";
import { GuideKeepReading } from "@/components/guide-keep-reading";
import { GuideShopCtas } from "@/components/guide-shop-ctas";
import { PublicChrome } from "@/components/public-chrome";
import { findPublicGuide, guideBreadcrumbJsonLd } from "@/lib/guides-catalog";
import { faqJsonLd } from "@/lib/seo-catalog";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";
import {
  WHATSAPP_GUIDE_FAQS,
  WHATSAPP_GUIDE_H1,
  WHATSAPP_GUIDE_INTRO,
  WHATSAPP_GUIDE_KEYWORDS,
  WHATSAPP_GUIDE_PUBLISHED,
  WHATSAPP_GUIDE_SECTIONS,
  WHATSAPP_GUIDE_STEPS,
  WHATSAPP_GUIDE_STEPS_INTRO,
  WHATSAPP_GUIDE_URL,
  whatsappArticleJsonLd,
} from "@/lib/whatsapp-guide";

const meta = PAGE_META.whatsappGuide;
const canonical = WHATSAPP_GUIDE_URL;

export const metadata: Metadata = {
  title: absoluteTitle(meta.title),
  description: meta.description,
  keywords: [...WHATSAPP_GUIDE_KEYWORDS],
  alternates: { canonical },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: canonical,
    type: "article",
    siteName: "Temp Empire",
    publishedTime: WHATSAPP_GUIDE_PUBLISHED,
    modifiedTime: WHATSAPP_GUIDE_PUBLISHED,
  },
  twitter: {
    card: "summary_large_image",
    title: meta.title,
    description: meta.description,
  },
  robots: { index: true, follow: true },
};

export default function WhatsAppTemporaryNumberGuidePage() {
  return (
    <PublicChrome>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(whatsappArticleJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(WHATSAPP_GUIDE_FAQS)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(guideBreadcrumbJsonLd(findPublicGuide("whatsapp"))),
        }}
      />

      <article className="mx-auto max-w-3xl">
        <GuideBreadcrumb current={findPublicGuide("whatsapp")} />
        <p className="eyebrow mt-6">Guide · WhatsApp OTP</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.035em] leading-tight">
          {WHATSAPP_GUIDE_H1}
        </h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Updated {WHATSAPP_GUIDE_PUBLISHED} · Temp Empire ·{" "}
          <Link href="/" className="text-[var(--accent)]">
            www.tempempire.store
          </Link>
        </p>

        <div className="mt-8 space-y-5 text-[var(--text-muted)] leading-relaxed text-[0.98rem]">
          {WHATSAPP_GUIDE_INTRO.map((p) => (
            <p key={p.slice(0, 48)}>{p}</p>
          ))}
        </div>

        {WHATSAPP_GUIDE_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">{section.h2}</h2>
            <div className="mt-3 space-y-4 text-[var(--text-muted)] leading-relaxed text-[0.98rem]">
              {section.body.map((p) => (
                <p key={p.slice(0, 56)}>{p}</p>
              ))}
            </div>
          </section>
        ))}

        <section id="five-steps" className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            How to get a temporary number — five steps
          </h2>
          <p className="mt-3 text-[var(--text-muted)] leading-relaxed text-[0.98rem]">
            {WHATSAPP_GUIDE_STEPS_INTRO}
          </p>
          <ol className="mt-6 space-y-3">
            {WHATSAPP_GUIDE_STEPS.map((step) => (
              <li key={step.n} className="panel px-4 py-3 flex gap-3 items-start">
                <span className="mono-data text-[var(--accent)] text-sm mt-0.5">{step.n}</span>
                <span>
                  <span className="font-medium text-[var(--text)]">{step.t}</span>
                  <span className="block text-sm text-[var(--text-muted)] leading-relaxed">
                    {step.d}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <GuideShopCtas />
        </section>

        <section id="faq" className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">FAQ</h2>
          <dl className="mt-6 space-y-5">
            {WHATSAPP_GUIDE_FAQS.map((f) => (
              <div key={f.q}>
                <dt className="font-medium">{f.q}</dt>
                <dd className="mt-1.5 text-sm text-[var(--text-muted)] leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Keep reading</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
            Country hubs stay public for Google. Shop buttons below still send guests to register.
          </p>
          <GuideKeepReading
            currentId="whatsapp"
            extras={[
              { href: "/buy/usa/whatsapp", label: "US WhatsApp hub" },
              { href: "/buy/india/whatsapp", label: "India WhatsApp hub" },
              { href: "/buy/uk/whatsapp", label: "UK WhatsApp hub" },
            ]}
          />
          <GuideShopCtas />
        </section>
      </article>
    </PublicChrome>
  );
}
