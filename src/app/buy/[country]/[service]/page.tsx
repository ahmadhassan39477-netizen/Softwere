import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandWordmark } from "@/components/brand-mark";
import { ServiceLogo } from "@/components/service-logo";
import {
  SEO_SERVICES,
  allSeoParams,
  faqJsonLd,
  findSeoCountry,
  findSeoService,
  seoArticleBody,
  seoH1,
  seoPageDescription,
  seoPageTitle,
  seoServiceFaqs,
  serviceJsonLd,
} from "@/lib/seo-catalog";
import { absoluteTitle } from "@/lib/seo-meta";

type Props = { params: Promise<{ country: string; service: string }> };

export function generateStaticParams() {
  return allSeoParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: cSlug, service: sSlug } = await params;
  const country = findSeoCountry(cSlug);
  const service = findSeoService(sSlug);
  if (!country || !service) return { title: "Temporary number · Temp Empire" };
  const title = seoPageTitle(country, service);
  const description = seoPageDescription(country, service);
  const canonical = `https://www.tempempire.store/buy/${country.slug}/${service.slug}`;
  return {
    title: absoluteTitle(title),
    description,
    keywords: [
      ...country.keywords.slice(0, 4),
      `${country.adjective} ${service.name} number`,
      `temporary ${country.adjective} number for ${service.name}`,
      `buy ${service.name} OTP ${country.adjective}`,
    ],
    alternates: { canonical },
    openGraph: {
      title: seoPageTitle(country, service),
      description: `Virtual ${country.adjective} (${country.dial}) SMS for ${service.name} verification.`,
      url: canonical,
      type: "article",
      siteName: "Temp Empire",
    },
    twitter: {
      card: "summary_large_image",
      title: seoPageTitle(country, service),
      description,
    },
  };
}

export default async function BuySeoPage({ params }: Props) {
  const { country: cSlug, service: sSlug } = await params;
  const country = findSeoCountry(cSlug);
  const service = findSeoService(sSlug);
  if (!country || !service) notFound();

  const h1 = seoH1(country, service);
  const body = seoArticleBody(country, service);
  const paragraphs = body.split("\n\n");
  const faqs = seoServiceFaqs(country, service);
  const related = SEO_SERVICES.filter((s) => s.slug !== service.slug).slice(0, 6);
  const registerHref = `/register?callbackUrl=${encodeURIComponent("/deposit")}`;

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceJsonLd(country, service)),
        }}
      />

      <header className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-4 sm:px-6">
        <Link href="/" className="min-w-0">
          <BrandWordmark compact />
        </Link>
        <Link href={registerHref} className="btn btn-primary shrink-0 whitespace-nowrap text-sm px-3 min-h-10">
          Sign up
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <p className="eyebrow">
          <Link href={`/buy/${country.slug}`} className="hover:text-[var(--accent)]">
            {country.flag} {country.name}
          </Link>
          {" · "}
          {service.name} · {country.dial}
        </p>
        <div className="mt-3 flex items-start gap-3">
          <ServiceLogo slug={service.slug} name={service.name} className="h-10 w-10 mt-1" />
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.035em] leading-tight">
            {h1}
          </h1>
        </div>

        <div className="mt-8 space-y-5 text-[var(--text-muted)] leading-relaxed">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 48)} className="text-[0.98rem]">
              {p}
            </p>
          ))}
        </div>

        {service.slug === "facebook" && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">
              Facebook OTP verification phone number
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              Use this {country.adjective} Facebook OTP number to receive SMS — not a public
              Facebook OTP code free list. If the Facebook OTP code is not received, eligible
              orders refund to your wallet.
            </p>
          </section>
        )}
        {service.slug === "whatsapp" && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">OTP website for WhatsApp</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              Temp Empire is a temp OTP website where you rent a {country.adjective} temp number,
              request the WhatsApp SMS yourself, and copy the code from a private inbox.
            </p>
          </section>
        )}

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

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            More {country.adjective} numbers
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {related.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/buy/${country.slug}/${s.slug}`}
                  className="inline-flex rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
                >
                  {s.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`/buy/${country.slug}`}
                className="inline-flex rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
              >
                All {country.adjective} guides
              </Link>
            </li>
          </ul>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={registerHref} className="btn btn-primary">
            Sign up to buy {country.adjective} {service.name}
          </Link>
          <Link href={`/buy/${country.slug}`} className="btn btn-ghost">
            All {country.adjective} temp numbers
          </Link>
          <Link href="/support" className="btn btn-ghost">
            Contact support
          </Link>
        </div>
      </article>
    </div>
  );
}
