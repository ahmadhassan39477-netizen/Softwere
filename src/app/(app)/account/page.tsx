"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  BookOpen,
  History,
  LogOut,
  MessageCircle,
  Settings,
  Wallet,
} from "lucide-react";
import { statusColor } from "@/lib/utils";

type OrderRow = {
  id: string;
  phoneNumber: string;
  otpCode: string | null;
  price: string;
  status: string;
  createdAt: string;
  country: { flag: string; name: string; code: string };
  service: { name: string; slug: string };
};

export default function AccountPage() {
  const { data: session, status } = useSession();

  const orders = useQuery({
    queryKey: ["orders"],
    enabled: status === "authenticated",
    refetchInterval: 8_000,
    queryFn: async () => {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ orders: OrderRow[] }>;
    },
  });

  if (status === "unauthenticated") {
    return (
      <div className="panel p-8 text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">Sign in to view your orders.</p>
        <Link href="/login" className="btn btn-primary mt-6 inline-flex">
          Sign in
        </Link>
      </div>
    );
  }

  const list = orders.data?.orders ?? [];
  const balance = session?.user?.balance ?? "0.0000";
  const withOtp = list.filter((o) => o.otpCode).length;
  const pending = list.filter((o) => o.status === "PENDING" || o.status === "WAITING").length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="eyebrow mb-2">Your space</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Account</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1 truncate">
          {session?.user?.email}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel panel-accent px-4 py-4">
          <p className="mono-data text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Balance
          </p>
          <p className="mt-1 text-xl font-semibold mono-data text-[var(--accent)]">${balance}</p>
          <Link href="/deposit" className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--accent)]">
            <MessageCircle size={14} /> Add credit
          </Link>
        </div>
        <div className="panel px-4 py-4">
          <p className="mono-data text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Purchases
          </p>
          <p className="mt-1 text-xl font-semibold">{list.length}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {withOtp} with OTP · {pending} waiting
          </p>
        </div>
        <div className="panel px-4 py-4 space-y-2">
          <p className="mono-data text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Shortcuts
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/deposit" className="btn btn-ghost text-xs min-h-9 gap-1.5 px-3">
              <Wallet size={14} /> Deposit
            </Link>
            <Link href="/orders" className="btn btn-ghost text-xs min-h-9 gap-1.5 px-3">
              <History size={14} /> Orders
            </Link>
            <Link href="/api-docs" className="btn btn-ghost text-xs min-h-9 gap-1.5 px-3">
              <BookOpen size={14} /> API
            </Link>
            <Link href="/settings" className="btn btn-ghost text-xs min-h-9 gap-1.5 px-3">
              <Settings size={14} /> Reseller
            </Link>
            <button
              type="button"
              className="btn btn-ghost text-xs min-h-9 gap-1.5 px-3"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="panel panel-accent overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 className="font-semibold tracking-tight">Order history</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Number purchases, status, and OTP when received.
            </p>
          </div>
          <Link href="/services" className="btn btn-primary text-xs min-h-9 px-3">
            Buy a number
          </Link>
        </div>

        {orders.isLoading && (
          <p className="p-6 text-sm text-[var(--text-muted)]">Loading your orders…</p>
        )}

        {!orders.isLoading && list.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-[var(--text-muted)]">No purchases yet.</p>
            <Link href="/services" className="btn btn-primary mt-4 inline-flex text-sm">
              Browse services
            </Link>
          </div>
        )}

        <ul className="divide-y divide-[var(--border)]">
          {list.map((o) => (
            <li key={o.id} className="px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium tracking-tight">
                    <span className="mr-1.5" aria-hidden>
                      {o.country.flag}
                    </span>
                    {o.service.name}
                    <span className="text-[var(--text-muted)] font-normal">
                      {" "}
                      · {o.country.name}
                    </span>
                  </p>
                  <p className="mono-data text-sm text-[var(--text)]">{o.phoneNumber}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(o.createdAt).toLocaleString()} · ${o.price}
                  </p>
                </div>
                <span className={`badge ${statusColor(o.status)}`}>{o.status}</span>
              </div>
              <div
                className={`mt-3 rounded-xl px-3 py-2.5 text-sm ${
                  o.otpCode
                    ? "bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] border border-[color-mix(in_oklab,var(--accent)_28%,var(--border))]"
                    : "bg-[var(--bg)] border border-[var(--border)]"
                }`}
              >
                <p className="mono-data text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  OTP
                </p>
                <p
                  className={`mt-0.5 font-mono text-lg tracking-[0.12em] ${
                    o.otpCode ? "text-[var(--accent)] font-semibold" : "text-[var(--text-muted)]"
                  }`}
                >
                  {o.otpCode ?? "Waiting for code…"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
