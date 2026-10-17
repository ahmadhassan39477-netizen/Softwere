"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Globe, Home, Server, ShieldOff, Wallet } from "lucide-react";

type Product = { id: string; title: string; blurb: string };

type Plan = {
  id: string;
  title: string;
  blurb: string;
  networkType: string;
  country?: string;
  retail: number;
};

type ProxyRow = {
  host?: string;
  port?: string | number;
  username?: string;
  password?: string;
  protocol?: string;
};

type Purchase = {
  id: string;
  planTitle: string;
  networkType: string;
  retail: number;
  createdAt: string;
  providerOrderId: string | null;
  proxies: ProxyRow[];
};

type VpnStatus = {
  connected: boolean;
  ready: boolean;
  displayName: string;
  currentIp: string | null;
  balance?: string;
  plans: Plan[];
  purchases: Purchase[];
  products: Product[];
  catalogError: string | null;
  message: string;
};

const ICONS: Record<string, typeof Server> = {
  datacenter: Server,
  DATACENTER: Server,
  residential: Home,
  RESIDENTIAL: Home,
  RESIDENTIAL_STATIC: Home,
  vpn: Globe,
  MOBILE: Globe,
};

export default function VpnProxyPage() {
  const { status, data: session } = useSession();
  const qc = useQueryClient();
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [ipError, setIpError] = useState<string | null>(null);
  const [buyMsg, setBuyMsg] = useState<string | null>(null);

  const vpn = useQuery({
    queryKey: ["vpn-status"],
    enabled: status === "authenticated",
    queryFn: async () => {
      const res = await fetch("/api/vpn");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not load VPN & Proxy.");
      }
      return data as VpnStatus;
    },
  });

  const buy = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch("/api/vpn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Purchase failed");
      return data as { purchase: Purchase; balance: string; message: string };
    },
    onSuccess: (data) => {
      setBuyMsg(data.message);
      qc.invalidateQueries({ queryKey: ["vpn-status"] });
    },
    onError: (e: Error) => setBuyMsg(e.message),
  });

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("https://api.ipify.org?format=json")
      .then(async (res) => {
        if (!res.ok) throw new Error("ipify");
        const data = (await res.json()) as { ip?: string };
        if (!cancelled) setPublicIp(data.ip ?? null);
      })
      .catch(() => {
        if (!cancelled) setIpError("Could not read your current public IP.");
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === "unauthenticated") {
    return (
      <div className="panel p-8 text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold">VPN & Proxy</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
          Sign in to view datacenter proxy, residential proxy, and VPN config. This page never
          fakes a connection.
        </p>
        <Link href="/login?callbackUrl=/services" className="btn btn-primary mt-6 inline-flex">
          Sign in
        </Link>
      </div>
    );
  }

  const shownIp = publicIp || vpn.data?.currentIp;
  const error = vpn.error instanceof Error ? vpn.error.message : null;
  const plans = vpn.data?.plans ?? [];
  const purchases = vpn.data?.purchases ?? [];
  const balance = Number(vpn.data?.balance ?? session?.user?.balance ?? 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">VPN & Proxy</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed mt-1">
          Datacenter proxies, residential proxies, and VPN configs on the same account as Temp
          Mail Plus. We do not show a fake “connected” tunnel.
        </p>
      </div>

      {error && (
        <p className="panel px-4 py-3 text-sm text-[#fda4af]" role="alert">
          {error}
        </p>
      )}
      {buyMsg && (
        <p className="panel px-4 py-3 text-sm" role="status">
          {buyMsg}
        </p>
      )}

      <div className="panel panel-accent p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldOff size={16} className="text-[var(--text-muted)]" />
          Not connected
        </div>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          {vpn.data?.message ?? "Loading status…"}
        </p>
        <div className="panel px-3 py-2 font-mono text-sm">
          {ipError && !shownIp ? (
            <span className="text-[#fda4af]">{ipError}</span>
          ) : (
            <>
              <span className="text-[var(--text-muted)] mr-2">Your current IP</span>
              {shownIp ?? "…"}
            </>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          That is your real address right now — not a proxy exit. Public IP lookup via ipify
          (no key).
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
          <Wallet size={14} />
          Wallet ${Number.isFinite(balance) ? balance.toFixed(4) : "0.0000"}
          <Link href="/deposit" className="text-[var(--accent)]">
            Deposit
          </Link>
        </div>
      </div>

      {plans.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const Icon = ICONS[p.networkType] ?? Globe;
            const canBuy = Number.isFinite(balance) && balance >= p.retail;
            return (
              <article key={p.id} className="panel p-4 space-y-2">
                <Icon size={18} className="text-[var(--accent)]" />
                <h2 className="font-semibold">{p.title}</h2>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{p.blurb}</p>
                <p className="text-sm font-medium">${p.retail.toFixed(4)}</p>
                <button
                  type="button"
                  className="btn btn-primary text-xs min-h-9 px-3"
                  disabled={buy.isPending}
                  onClick={() => buy.mutate(p.id)}
                >
                  {buy.isPending ? "Buying…" : canBuy ? "Buy" : "Buy — deposit first"}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {(vpn.data?.products ?? []).map((p) => {
            const Icon = ICONS[p.id] ?? Globe;
            return (
              <article key={p.id} className="panel p-4 space-y-2">
                <Icon size={18} className="text-[var(--accent)]" />
                <h2 className="font-semibold">{p.title}</h2>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{p.blurb}</p>
                <button type="button" className="btn btn-ghost text-xs min-h-9 px-3" disabled>
                  {vpn.data?.ready ? "Waiting on live catalog" : "Coming when Admin adds a key"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {purchases.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Your purchases</h2>
          <p className="text-xs text-[var(--text-muted)]">
            These are provider credentials — not an in-browser VPN session.
          </p>
          {purchases.map((row) => (
            <article key={row.id} className="panel p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-medium">{row.planTitle}</h3>
                <span className="text-sm text-[var(--text-muted)]">${row.retail.toFixed(4)}</span>
              </div>
              {row.proxies.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Credentials appear when the provider finishes provisioning.
                </p>
              ) : (
                row.proxies.map((proxy, i) => (
                  <pre
                    key={`${row.id}-${i}`}
                    className="panel px-3 py-2 text-xs font-mono overflow-x-auto"
                  >
                    {[
                      proxy.protocol,
                      proxy.host && proxy.port ? `${proxy.host}:${proxy.port}` : proxy.host,
                      proxy.username ? `user ${proxy.username}` : "",
                      proxy.password ? `pass ${proxy.password}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </pre>
                ))
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
