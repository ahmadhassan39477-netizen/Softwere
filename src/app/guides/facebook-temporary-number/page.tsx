import type { Metadata } from "next";
import Link from "next/link";
import { GuideShopCtas } from "@/components/guide-shop-ctas";
import { PublicChrome } from "@/components/public-chrome";
import { faqJsonLd } from "@/lib/seo-catalog";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";
import {
  FACEBOOK_GUIDE_FAQS,
  FACEBOOK_GUIDE_H1,
  FACEBOOK_GUIDE_INTRO,
  FACEBOOK_GUIDE_KEYWORDS,
  FACEBOOK_GUIDE_PUBLISHED,
  FACEBOOK_GUIDE_SECTIONS,
  FACEBOOK_GUIDE_STEPS,
  FACEBOOK_GUIDE_STEPS_INTRO,
  FACEBOOK_GUIDE_URL,
  facebookArticleJsonLd,
} from "@/lib/facebook-guide";

const meta = PAGE_META.facebookGuide;
const canonical = FACEBOOK_GUIDE_URL;

export const metadata: Metadata = {
  title: absoluteTitle(meta.title),
  description: meta.description,
  keywords: [...FACEBOOK_GUIDE_KEYWORDS],
  alternates: { canonical },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: canonical,
    type: "article",
    siteName: "Temp Empire",
    publishedTime: FACEBOOK_GUIDE_PUBLISHED,
    modifiedTime: FACEBOOK_GUIDE_PUBLISHED,
  },
  twitter: {
    card: "summary_large_image",
    title: meta.title,
    description: meta.description,
  },
  robots: { index: true, follow: true },
};

export default function FacebookTemporaryNumberGuidePage() {
  return (
    <PublicChrome>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(facebookArticleJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FACEBOOK_GUIDE_FAQS)) }}
      />

      <article className="mx-auto max-w-3xl">
        <p className="eyebrow">Guide · Facebook OTP</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.035em] leading-tight">
          {FACEBOOK_GUIDE_H1}
        </h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Updated {FACEBOOK_GUIDE_PUBLISHED} · Temp Empire ·{" "}
          <Link href="/" className="text-[var(--accent)]">
            www.tempempire.store
          </Link>
        </p>

        <div className="mt-8 space-y-5 text-[var(--text-muted)] leading-relaxed text-[0.98rem]">
          {FACEBOOK_GUIDE_INTRO.map((p) => (
            <p key={p.slice(0, 48)}>{p}</p>
          ))}
        </div>

        {FACEBOOK_GUIDE_SECTIONS.map((section) => (
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
            How to get a temp number for facebook — five steps
          </h2>
          <p className="mt-3 text-[var(--text-muted)] leading-relaxed text-[0.98rem]">
            {FACEBOOK_GUIDE_STEPS_INTRO}
          </p>
          <ol className="mt-6 space-y-3">
            {FACEBOOK_GUIDE_STEPS.map((step) => (
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
          <GuideShopCtas service="facebook" />
        </section>

        <section id="faq" className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">FAQ</h2>
          <dl className="mt-6 space-y-5">
            {FACEBOOK_GUIDE_FAQS.map((f) => (
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
          <ul className="mt-4 flex flex-wrap gap-2">
            <li>
              <Link
                href="/buy/usa/facebook"
                className="inline-flex rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
              >
                US Facebook hub
              </Link>
            </li>
            <li>
              <Link
                href="/buy/uk/facebook"
                className="inline-flex rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
              >
                UK Facebook hub
              </Link>
            </li>
            <li>
              <Link
                href="/guides/whatsapp-temporary-number"
                className="inline-flex rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
              >
                WhatsApp guide
              </Link>
            </li>
            <li>
              <Link
                href="/guides/disposable-phone-number"
                className="inline-flex rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
              >
                Disposable guide
              </Link>
            </li>
            <li>
              <Link
                href="/guides/reseller-api"
                className="inline-flex rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
              >
                Reseller API guide
              </Link>
            </li>
          </ul>
          <GuideShopCtas service="facebook" />
        </section>
      </article>
    </PublicChrome>
  );
}
