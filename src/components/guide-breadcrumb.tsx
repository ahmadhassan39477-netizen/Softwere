import Link from "next/link";
import { GUIDES_HUB_PATH, type PublicGuide } from "@/lib/guides-catalog";

export function GuideBreadcrumb({ current }: { current: PublicGuide }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[var(--text-muted)]">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-[var(--accent)]">
            Home
          </Link>
        </li>
        <li aria-hidden="true">→</li>
        <li>
          <Link href={GUIDES_HUB_PATH} className="hover:text-[var(--accent)]">
            Guides
          </Link>
        </li>
        <li aria-hidden="true">→</li>
        <li className="text-[var(--text)]" aria-current="page">
          {current.label}
        </li>
      </ol>
    </nav>
  );
}
