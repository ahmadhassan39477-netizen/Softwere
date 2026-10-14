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
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { BrandWordmark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/services", label: "Services", icon: LayoutGrid },
  { href: "/temp-mail", label: "Temp Mail", icon: Mail },
  { href: "/deposit", label: "Deposit", icon: Wallet },
  { href: "/orders", label: "Orders", icon: History },
  { href: "/api-docs", label: "API Docs", icon: BookOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const balance = session?.user?.balance ?? "0.0000";

  return (
    <div className="min-h-screen flex">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[17.5rem] shell-aside transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 h-[4.25rem] border-b border-[var(--border)]">
          <Link href="/" onClick={() => setOpen(false)}>
            <BrandWordmark compact />
          </Link>
          <button className="lg:hidden btn btn-ghost p-2" onClick={() => setOpen(false)} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          <p className="px-3 pt-2 pb-2 mono-data text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Portal
          </p>
          {NAV.map((item, i) => {
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
                  onClick={() => setOpen(false)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors border border-transparent",
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
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors border border-transparent",
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
        <div className="absolute bottom-0 inset-x-0 p-4">
          <div className="divider-neon mb-3" />
          <p className="mono-data text-[10px] text-[var(--text-muted)] px-1">
            TEMP EMPIRE · v0.1
          </p>
        </div>
      </aside>

      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/55 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close overlay"
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-[4.25rem] shell-top px-4 flex items-center justify-between gap-3">
          <button className="lg:hidden btn btn-ghost p-2" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={18} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="balance-chip rounded-full px-3.5 py-1.5 text-sm mono-data">
              <span className="text-[var(--text-muted)] mr-1.5 text-[10px] uppercase tracking-[0.14em]">
                Bal
              </span>
              <span className="text-[var(--accent)]">${balance}</span>
            </div>
            <button className="btn btn-ghost p-2" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {session?.user ? (
              <div className="relative">
                <button className="btn btn-ghost gap-2" onClick={() => setProfileOpen((v) => !v)}>
                  <span className="hidden sm:inline max-w-[140px] truncate text-sm">
                    {session.user.email}
                  </span>
                  <ChevronDown size={16} />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 mt-2 w-52 panel p-2 shadow-xl"
                    >
                      <Link
                        href="/settings"
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--card-hover)]"
                        onClick={() => setProfileOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--card-hover)]"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        <LogOut size={14} /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary">
                Sign in
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
