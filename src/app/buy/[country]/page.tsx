import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandWordmark } from "@/components/brand-mark";
import { ServiceLogo } from "@/components/service-logo";
import {
  SEO_SERVICES,
  allSeoCountrySlugs,
  faqJsonLd,
  findSeoCountry,
  seoHubArticle,
  seoHubDescription,
  seoHubFaqs,
  seoHubH1,
  seoHubServicesH2,
  seoHubTitle,
  serviceJsonLd,
} from "@/lib/seo-catalog";
import { absoluteTitle } from "@/lib/seo-meta";

type Props = { params: Promise<{ country: string }> };

export function generateStaticParams() {
  return allSeoCountrySlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: cSlug } = await params;
  const country = findSeoCountry(cSlug);
  if (!country) return { title: "Temporary numbers · Temp Empire" };
  const title = seoHubTitle(country);
  const description = seoHubDescription(country);
  const canonical = `https://www.tempempire.store/buy/${country.slug}`;
  return {
    title: absoluteTitle(title),
    description,
    keywords: country.keywords,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "Temp Empire",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BuyCountryHubPage({ params }: Props) {
  const { country: cSlug } = await params;
  const country = findSeoCountry(cSlug);
  if (!country) notFound();

  const h1 = seoHubH1(country);
  const paragraphs = seoHubArticle(country).split("\n\n");
  const faqs = seoHubFaqs(country);
  const registerHref = `/register?callbackUrl=${encodeURIComponent(`/services?country=${country.code}`)}`;

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd(country)) }}
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
          {country.flag} {country.name} · {country.dial} temporary numbers
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.035em] leading-tight">
          {h1}
        </h1>

        <div className="mt-8 space-y-5 text-[var(--text-muted)] leading-relaxed">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 64)} className="text-[0.98rem]">
              {p}
            </p>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            {seoHubServicesH2(country)}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Open a guide for each app, then sign up to buy from live stock.
          </p>
          {(country.slug === "usa" || country.slug === "uk") && (
            <p className="mt-4 text-sm text-[var(--text-muted)] leading-relaxed">
              Start with{" "}
              {country.slug === "usa" ? (
                <>
                  the{" "}
                  <Link href="/buy/usa/whatsapp" className="text-[var(--accent)]">
                    US WhatsApp temp number
                  </Link>{" "}
                  or{" "}
                  <Link href="/buy/usa/facebook" className="text-[var(--accent)]">
                    US Facebook OTP number
                  </Link>
                </>
              ) : (
                <>
                  the{" "}
                  <Link href="/buy/uk/facebook" className="text-[var(--accent)]">
                    UK Facebook OTP number
                  </Link>{" "}
                  or{" "}
                  <Link href="/buy/uk/whatsapp" className="text-[var(--accent)]">
                    UK WhatsApp temp number
                  </Link>
                </>
              )}
              , then browse the full list below.
            </p>
          )}
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {SEO_SERVICES.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/buy/${country.slug}/${service.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-3 hover:border-[var(--accent)] transition-colors"
                >
                  <ServiceLogo slug={service.slug} name={service.name} className="h-8 w-8" />
                  <span className="text-sm font-medium">
                    {country.adjective} {service.name} number
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-[var(--text-muted)] leading-relaxed">
            Read the{" "}
            <Link href="/guides/whatsapp-temporary-number" className="text-[var(--accent)]">
              WhatsApp temp number guide
            </Link>
            , the{" "}
            <Link href="/guides/facebook-temporary-number" className="text-[var(--accent)]">
              Facebook temp number guide
            </Link>
            , or{" "}
            <Link href="/guides" className="text-[var(--accent)]">
              all guides
            </Link>
            .
          </p>
        </section>

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
          <Link href={registerHref} className="btn btn-primary">
            Sign up to buy {country.adjective} numbers
          </Link>
          {country.slug !== "usa" && (
            <Link href="/buy/usa" className="btn btn-ghost">
              US temp num
            </Link>
          )}
          {country.slug !== "uk" && (
            <Link href="/buy/uk" className="btn btn-ghost">
              UK temp num
            </Link>
          )}
          {country.slug !== "canada" && (
            <Link href="/buy/canada" className="btn btn-ghost">
              Temp num Canada
            </Link>
          )}
          <Link href="/support" className="btn btn-ghost">
            Support
          </Link>
        </div>
      </article>
    </div>
  );
}
