import Link from "next/link";
import { BrandWordmark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";

export function PublicChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-6">
        <Link href="/" className="min-w-0" aria-label="Temp Empire home">
          <BrandWordmark priority />
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href="/login?callbackUrl=/deposit" className="btn btn-ghost !hidden md:!inline-flex">
            Sign in
          </Link>
          <Link
            href="/register?callbackUrl=/deposit"
            className="btn btn-primary shrink-0 whitespace-nowrap text-sm !px-3 !min-h-10 sm:!px-4"
          >
            Sign up
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 pb-16 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
