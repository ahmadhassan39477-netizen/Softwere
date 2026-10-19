import type { Metadata } from "next";
import Link from "next/link";
import { PublicChrome } from "@/components/public-chrome";
import {
  GUIDES_HUB_URL,
  PUBLIC_GUIDES,
  guidesHubBreadcrumbJsonLd,
  guidesHubJsonLd,
} from "@/lib/guides-catalog";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";

const meta = PAGE_META.guidesHub;

export const metadata: Metadata = {
  title: absoluteTitle(meta.title),
  description: meta.description,
  alternates: { canonical: GUIDES_HUB_URL },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: GUIDES_HUB_URL,
    type: "website",
    siteName: "Temp Empire",
  },
  twitter: {
    card: "summary_large_image",
    title: meta.title,
    description: meta.description,
  },
  robots: { index: true, follow: true },
};

export default function GuidesHubPage() {
  return (
    <PublicChrome>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guidesHubJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guidesHubBreadcrumbJsonLd()) }}
      />

      <article className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-sm text-[var(--text-muted)]">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-[var(--accent)]">
                Home
              </Link>
            </li>
            <li aria-hidden="true">→</li>
            <li className="text-[var(--text)]" aria-current="page">
              Guides
            </li>
          </ol>
        </nav>
        <p className="eyebrow mt-6">Guides</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.035em] leading-tight">
          Guides for temp numbers, OTP, and the Reseller API
        </h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Guest-readable articles on{" "}
          <Link href="/" className="text-[var(--accent)]">
            www.tempempire.store
          </Link>
          . Sign up is still required to buy a number or generate API keys.
        </p>

        <ul className="mt-10 grid gap-4">
          {PUBLIC_GUIDES.map((g) => (
            <li key={g.path}>
              <Link
                href={g.path}
                className="panel panel-accent p-6 block hover:border-[var(--accent)] transition-colors"
              >
                <p className="eyebrow !mb-2">{g.eyebrow}</p>
                <h2 className="text-xl font-semibold tracking-tight">{g.title}</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{g.blurb}</p>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </PublicChrome>
  );
}
