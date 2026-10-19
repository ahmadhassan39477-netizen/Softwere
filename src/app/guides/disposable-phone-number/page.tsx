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
  DISPOSABLE_GUIDE_FAQS,
  DISPOSABLE_GUIDE_H1,
  DISPOSABLE_GUIDE_INTRO,
  DISPOSABLE_GUIDE_KEYWORDS,
  DISPOSABLE_GUIDE_PUBLISHED,
  DISPOSABLE_GUIDE_SECTIONS,
  DISPOSABLE_GUIDE_STEPS,
  DISPOSABLE_GUIDE_STEPS_INTRO,
  DISPOSABLE_GUIDE_URL,
  disposableArticleJsonLd,
} from "@/lib/disposable-guide";

const meta = PAGE_META.disposableGuide;
const canonical = DISPOSABLE_GUIDE_URL;

export const metadata: Metadata = {
  title: absoluteTitle(meta.title),
  description: meta.description,
  keywords: [...DISPOSABLE_GUIDE_KEYWORDS],
  alternates: { canonical },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: canonical,
    type: "article",
    siteName: "Temp Empire",
    publishedTime: DISPOSABLE_GUIDE_PUBLISHED,
    modifiedTime: DISPOSABLE_GUIDE_PUBLISHED,
  },
  twitter: {
    card: "summary_large_image",
    title: meta.title,
    description: meta.description,
  },
  robots: { index: true, follow: true },
};

export default function DisposablePhoneNumberGuidePage() {
  return (
    <PublicChrome>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(disposableArticleJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(DISPOSABLE_GUIDE_FAQS)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(guideBreadcrumbJsonLd(findPublicGuide("disposable"))),
        }}
      />

      <article className="mx-auto max-w-3xl">
        <GuideBreadcrumb current={findPublicGuide("disposable")} />
        <p className="eyebrow mt-6">Guide · Disposable number + temp mail</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.035em] leading-tight">
          {DISPOSABLE_GUIDE_H1}
        </h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Updated {DISPOSABLE_GUIDE_PUBLISHED} · Temp Empire ·{" "}
          <Link href="/" className="text-[var(--accent)]">
            www.tempempire.store
          </Link>
        </p>

        <div className="mt-8 space-y-5 text-[var(--text-muted)] leading-relaxed text-[0.98rem]">
          {DISPOSABLE_GUIDE_INTRO.map((p) => (
            <p key={p.slice(0, 48)}>{p}</p>
          ))}
        </div>

        {DISPOSABLE_GUIDE_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">{section.h2}</h2>
            <div className="mt-3 space-y-4 text-[var(--text-muted)] leading-relaxed text-[0.98rem]">
              {section.body.map((p) => (
                <p key={p.slice(0, 56)}>{p}</p>
              ))}
            </div>
            {section.h3 ? (
              <h3 className="mt-6 text-lg font-semibold tracking-tight">{section.h3}</h3>
            ) : null}
            {section.steps ? (
              <ol className="mt-4 space-y-3">
                {section.steps.map((step, i) => (
                  <li key={step.t} className="panel px-4 py-3 flex gap-3 items-start">
                    <span className="mono-data text-[var(--accent)] text-sm mt-0.5">{i + 1}</span>
                    <span>
                      <span className="font-medium text-[var(--text)]">{step.t}</span>
                      <span className="block text-sm text-[var(--text-muted)] leading-relaxed">
                        {step.d}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
        ))}

        <section id="five-steps" className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            How to get a disposable phone number — five steps
          </h2>
          <p className="mt-3 text-[var(--text-muted)] leading-relaxed text-[0.98rem]">
            {DISPOSABLE_GUIDE_STEPS_INTRO}
          </p>
          <ol className="mt-6 space-y-3">
            {DISPOSABLE_GUIDE_STEPS.map((step) => (
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
          <GuideShopCtas service="disposable" />
        </section>

        <section id="faq" className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">FAQ</h2>
          <dl className="mt-6 space-y-5">
            {DISPOSABLE_GUIDE_FAQS.map((f) => (
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
            Country hubs and the mail landing stay public for Google. Shop buttons below still send
            guests to register.
          </p>
          <GuideKeepReading
            currentId="disposable"
            extras={[
              { href: "/buy/usa", label: "US temp num hub" },
              { href: "/buy/uk", label: "UK temp num hub" },
              { href: "/mail", label: "Temp Mail Plus" },
            ]}
          />
          <GuideShopCtas service="disposable" />
        </section>
      </article>
    </PublicChrome>
  );
}
