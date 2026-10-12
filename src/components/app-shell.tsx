"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
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
  Zap,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
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
          "fixed inset-y-0 left-0 z-40 w-64 panel border-r border-[var(--border)] bg-[var(--bg-elevated)] transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-[var(--border)]">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
              <Zap size={16} />
            </span>
            Temp Empire
          </Link>
          <button className="lg:hidden btn btn-ghost p-2" onClick={() => setOpen(false)} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-[color-mix(in_oklab,var(--accent)_22%,transparent)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text)]",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
          {session?.user?.role === "ADMIN" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-[color-mix(in_oklab,var(--accent)_22%,transparent)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--card-hover)]",
              )}
            >
              <Shield size={18} />
              Admin
            </Link>
          )}
        </nav>
      </aside>

      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close overlay"
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] backdrop-blur-md px-4 flex items-center justify-between gap-3">
          <button className="lg:hidden btn btn-ghost p-2" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={18} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="panel px-3 py-1.5 text-sm font-mono">
              <span className="text-[var(--text-muted)] mr-1">Bal</span>${balance}
            </div>
            <button className="btn btn-ghost p-2" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {session?.user ? (
              <div className="relative">
                <button
                  className="btn btn-ghost gap-2"
                  onClick={() => setProfileOpen((v) => !v)}
                >
                  <span className="hidden sm:inline max-w-[140px] truncate">{session.user.email}</span>
                  <ChevronDown size={16} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 panel p-2 shadow-xl">
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
                  </div>
                )}
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
