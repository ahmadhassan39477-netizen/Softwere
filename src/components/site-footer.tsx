import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import {
  REGISTER_DEPOSIT,
  REGISTER_MAIL,
  REGISTER_SERVICES,
  REGISTER_UK,
  REGISTER_USA,
} from "@/lib/guest-links";

const PRODUCT = [
  { href: REGISTER_SERVICES, label: "Sign up" },
  { href: REGISTER_DEPOSIT, label: "Deposit" },
  { href: REGISTER_SERVICES, label: "Services" },
  { href: REGISTER_USA, label: "US numbers" },
  { href: REGISTER_UK, label: "UK numbers" },
  { href: REGISTER_MAIL, label: "Temp Mail Plus" },
] as const;

const TRUST = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/support", label: "Contact" },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2.5 mb-3">
            <BrandMark size={28} />
            <span className="font-semibold tracking-[-0.035em]">
              <span>temp </span>
              <span className="text-[var(--accent)]">empire</span>
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">
            Independent shop for private temporary numbers and disposable email. Sign up, message
            us on WhatsApp, we add credit, then buy a number. Not a phone carrier.
          </p>
        </div>
        <div>
          <div className="mono-data text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">
            Start
          </div>
          <ul className="space-y-2 text-sm">
            {PRODUCT.map((item) => (
              <li key={`${item.href}-${item.label}`}>
                <Link href={item.href} className="hover:text-[var(--accent)]">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mono-data text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">
            Trust
          </div>
          <ul className="space-y-2 text-sm">
            {TRUST.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-[var(--accent)]">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="divider-neon opacity-40" />
      <div className="mx-auto max-w-6xl px-6 py-5 flex flex-wrap justify-between gap-2 mono-data text-[10px] text-[var(--text-muted)] uppercase tracking-[0.14em]">
        <span>© {new Date().getFullYear()} Temp Empire</span>
        <span>
          <Link href="/privacy" className="hover:text-[var(--accent)]">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-[var(--accent)]">
            Terms
          </Link>
        </span>
      </div>
    </footer>
  );
}
