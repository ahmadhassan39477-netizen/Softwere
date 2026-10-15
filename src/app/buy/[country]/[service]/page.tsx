import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandWordmark } from "@/components/brand-mark";
import { ServiceLogo } from "@/components/service-logo";
import {
  allSeoParams,
  findSeoCountry,
  findSeoService,
  seoArticleBody,
  seoH1,
  seoPageTitle,
} from "@/lib/seo-catalog";

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
  return {
    title: `${title} | Temp Empire`,
    description: `Buy a ${country.adjective} virtual number for ${service.name} OTP. Privacy-first disposable SMS with crypto wallet payments.`,
    openGraph: { title, description: `Virtual ${country.adjective} SMS for ${service.name} verification.` },
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

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/">
          <BrandWordmark compact />
        </Link>
        <Link href="/services" className="btn btn-primary text-sm">
          Get number
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <p className="eyebrow">
          {country.flag} {country.name} · {service.name}
        </p>
        <div className="mt-3 flex items-start gap-3">
          <ServiceLogo slug={service.slug} name={service.name} className="h-10 w-10 mt-1" />
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.035em] leading-tight">{h1}</h1>
        </div>

        <div className="mt-8 space-y-5 text-[var(--text-muted)] leading-relaxed">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 48)} className="text-[0.98rem]">
              {p}
            </p>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={`/services?country=${country.code}&service=${service.slug}`}
            className="btn btn-primary"
          >
            Buy {country.adjective} {service.name} number
          </Link>
          <Link href="/support" className="btn btn-ghost">
            Contact support
          </Link>
        </div>
      </article>
    </div>
  );
}
