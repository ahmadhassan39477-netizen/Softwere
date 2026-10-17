import Link from "next/link";
import { BrandWordmark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";

export function PublicChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-6">
        <Link href="/" aria-label="Temp Empire home">
          <BrandWordmark priority />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/register?callbackUrl=/deposit" className="btn btn-primary text-sm px-3 sm:px-4">
            Sign up
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 pb-16 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
