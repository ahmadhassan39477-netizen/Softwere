import type { Metadata } from "next";
import Link from "next/link";
import { GuideApiCtas } from "@/components/guide-api-ctas";
import { GuideBreadcrumb } from "@/components/guide-breadcrumb";
import { GuideKeepReading } from "@/components/guide-keep-reading";
import { PublicChrome } from "@/components/public-chrome";
import { findPublicGuide, guideBreadcrumbJsonLd } from "@/lib/guides-catalog";
import { faqJsonLd } from "@/lib/seo-catalog";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";
import {
  RESELLER_API_GUIDE_FAQS,
  RESELLER_API_GUIDE_H1,
  RESELLER_API_GUIDE_INTRO,
  RESELLER_API_GUIDE_KEYWORDS,
  RESELLER_API_GUIDE_PUBLISHED,
  RESELLER_API_GUIDE_SECTIONS,
  RESELLER_API_GUIDE_STEPS,
  RESELLER_API_GUIDE_STEPS_INTRO,
  RESELLER_API_GUIDE_URL,
  resellerApiArticleJsonLd,
} from "@/lib/reseller-api-guide";

const meta = PAGE_META.resellerApiGuide;
const canonical = RESELLER_API_GUIDE_URL;

export const metadata: Metadata = {
  title: absoluteTitle(meta.title),
  description: meta.description,
  keywords: [...RESELLER_API_GUIDE_KEYWORDS],
  alternates: { canonical },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: canonical,
    type: "article",
    siteName: "Temp Empire",
    publishedTime: RESELLER_API_GUIDE_PUBLISHED,
    modifiedTime: RESELLER_API_GUIDE_PUBLISHED,
  },
  twitter: {
    card: "summary_large_image",
    title: meta.title,
    description: meta.description,
  },
  robots: { index: true, follow: true },
};

export default function ResellerApiGuidePage() {
  return (
    <PublicChrome>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(resellerApiArticleJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(RESELLER_API_GUIDE_FAQS)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(guideBreadcrumbJsonLd(findPublicGuide("reseller-api"))),
        }}
      />

      <article className="mx-auto max-w-3xl">
        <GuideBreadcrumb current={findPublicGuide("reseller-api")} />
        <p className="eyebrow mt-6">Guide · Reseller API</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.035em] leading-tight">
          {RESELLER_API_GUIDE_H1}
        </h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Updated {RESELLER_API_GUIDE_PUBLISHED} · Temp Empire ·{" "}
          <Link href="/" className="text-[var(--accent)]">
            www.tempempire.store
          </Link>
        </p>

        <div className="mt-8 space-y-5 text-[var(--text-muted)] leading-relaxed text-[0.98rem]">
          {RESELLER_API_GUIDE_INTRO.map((p) => (
            <p key={p.slice(0, 48)}>{p}</p>
          ))}
        </div>

        {RESELLER_API_GUIDE_SECTIONS.map((section) => (
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
            {section.code ? (
              <div className="mt-4 panel p-4">
                <p className="mono-data text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">
                  {section.code.title}
                </p>
                <pre className="overflow-x-auto text-xs sm:text-sm font-mono text-[var(--text-muted)] whitespace-pre-wrap">
                  {section.code.text}
                </pre>
              </div>
            ) : null}
          </section>
        ))}

        <section id="five-steps" className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            How to automate SMS verification — five steps
          </h2>
          <p className="mt-3 text-[var(--text-muted)] leading-relaxed text-[0.98rem]">
            {RESELLER_API_GUIDE_STEPS_INTRO}
          </p>
          <ol className="mt-6 space-y-3">
            {RESELLER_API_GUIDE_STEPS.map((step) => (
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
          <GuideApiCtas />
        </section>

        <section id="faq" className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">FAQ</h2>
          <dl className="mt-6 space-y-5">
            {RESELLER_API_GUIDE_FAQS.map((f) => (
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
            Country hubs stay public for Google. API docs / generate keys still send guests to
            register.
          </p>
          <GuideKeepReading currentId="reseller-api" />
          <GuideApiCtas />
        </section>
      </article>
    </PublicChrome>
  );
}
