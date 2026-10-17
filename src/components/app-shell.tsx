"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  Mail,
  Wallet,
  History,
  BookOpen,
  Shield,
  Home,
  Settings,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  UserRound,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { BrandWordmark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

const DESKTOP_NAV = [
  { href: "/services", label: "Services", icon: LayoutGrid },
  { href: "/temp-mail", label: "Temp Mail", icon: Mail },
  { href: "/deposit", label: "Deposit", icon: Wallet },
  { href: "/orders", label: "Orders", icon: History },
  { href: "/account", label: "Account", icon: UserRound },
  { href: "/api-docs", label: "API Docs", icon: BookOpen },
];

/** Mobile bottom tabs — native-app pattern */
const MOBILE_TABS = [
  { href: "/services", label: "Home", icon: Home },
  { href: "/orders", label: "Orders", icon: History },
  { href: "/deposit", label: "Deposit", icon: Wallet },
  { href: "/account", label: "Account", icon: UserRound },
] as const;

const PROFILE_LINKS = [
  { href: "/account", label: "Account", icon: UserRound },
  { href: "/deposit", label: "Deposit", icon: Wallet },
  { href: "/orders", label: "Orders", icon: History },
  { href: "/api-docs", label: "API Docs", icon: BookOpen },
  { href: "/settings", label: "Reseller API", icon: Settings },
] as const;

const MOBILE_ADMIN_TAB = { href: "/admin", label: "Admin", icon: Shield } as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  const balance = session?.user?.balance ?? "0.0000";
  const isAdmin = session?.user?.role === "ADMIN";
  const mobileTabs = isAdmin ? [...MOBILE_TABS, MOBILE_ADMIN_TAB] : [...MOBILE_TABS];

  return (
    <div className="min-h-screen flex bg-[var(--bg)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[17.5rem] lg:shrink-0 shell-aside relative">
        <div className="flex items-center px-5 h-[4.25rem] border-b border-[var(--border)]">
          <Link href="/">
            <BrandWordmark compact priority />
          </Link>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          <p className="px-3 pt-2 pb-2 mono-data text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Menu
          </p>
          {DESKTOP_NAV.map((item, i) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.35 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors border border-transparent",
                    "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                    active
                      ? "nav-active"
                      : "text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text)]",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-glow"
                      className="absolute inset-0 rounded-xl bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon size={17} className={cn("relative z-[1]", active && "text-[var(--accent)]")} />
                  <span className="relative z-[1]">{item.label}</span>
                </Link>
              </motion.div>
            );
          })}
          {session?.user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors border border-transparent",
                "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                pathname.startsWith("/admin")
                  ? "nav-active"
                  : "text-[var(--text-muted)] hover:bg-[var(--card-hover)]",
              )}
            >
              <Shield size={17} />
              Admin
            </Link>
          )}
        </nav>
        <div className="p-4">
          <div className="divider-neon mb-3" />
          <p className="mono-data text-[10px] text-[var(--text-muted)] px-1">TEMP EMPIRE · v0.1</p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {/* Sticky mobile/desktop top header */}
        <header className="sticky top-0 z-30 h-14 sm:h-[4.25rem] shell-top px-4 flex items-center justify-between gap-3 safe-top">
          <Link
            href="/services"
            className="min-h-12 inline-flex items-center rounded-xl px-1 -ml-1 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <BrandWordmark compact priority />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/deposit"
              className={cn(
                "balance-chip inline-flex min-h-12 items-center rounded-full px-4 text-sm mono-data",
                "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              )}
            >
              <span className="text-[var(--text-muted)] mr-1.5 text-[10px] uppercase tracking-[0.14em]">
                Balance
              </span>
              <span className="text-[var(--accent)] font-semibold">${balance}</span>
            </Link>

            <button
              type="button"
              className="hidden sm:inline-flex btn btn-ghost min-h-12 min-w-12 p-0"
              onClick={toggle}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {session?.user ? (
              <div className="relative hidden lg:block">
                <button
                  type="button"
                  className="btn btn-ghost gap-2 min-h-12"
                  onClick={() => setProfileOpen((v) => !v)}
                >
                  <span className="max-w-[140px] truncate text-sm">{session.user.email}</span>
                  <ChevronDown size={16} />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 mt-2 w-56 panel p-2 shadow-xl"
                    >
                      {PROFILE_LINKS.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-[var(--card-hover)] active:bg-[var(--card-hover)]"
                            onClick={() => setProfileOpen(false)}
                          >
                            <Icon size={14} className="text-[var(--text-muted)]" />
                            {item.label}
                          </Link>
                        );
                      })}
                      <div className="my-1 h-px bg-[var(--border)]" />
                      <button
                        type="button"
                        className="flex w-full min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-[var(--card-hover)] active:bg-[var(--card-hover)]"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        <LogOut size={14} /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary min-h-12">
                Sign in
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Fixed bottom tab bar — mobile only */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-elevated)_92%,transparent)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <div
          className={`grid h-[4.5rem] ${isAdmin ? "grid-cols-5" : "grid-cols-4"}`}
        >
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const active =
              tab.href === "/services"
                ? pathname === "/services" || pathname === "/"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-wide",
                  "active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]",
                  active ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-x-3 top-2 bottom-2 rounded-2xl bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <Icon size={22} strokeWidth={active ? 2.4 : 2} className="relative z-[1]" />
                <span className="relative z-[1]">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
