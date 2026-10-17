"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Globe, Home, Server, ShieldOff } from "lucide-react";

type Product = { id: string; title: string; blurb: string };

type VpnStatus = {
  connected: boolean;
  ready: boolean;
  displayName: string;
  currentIp: string | null;
  products: Product[];
  message: string;
};

const ICONS: Record<string, typeof Server> = {
  datacenter: Server,
  residential: Home,
  vpn: Globe,
};

export default function VpnProxyPage() {
  const { status } = useSession();
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [ipError, setIpError] = useState<string | null>(null);

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
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(vpn.data?.products ?? []).map((p) => {
          const Icon = ICONS[p.id] ?? Globe;
          return (
            <article key={p.id} className="panel p-4 space-y-2">
              <Icon size={18} className="text-[var(--accent)]" />
              <h2 className="font-semibold">{p.title}</h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{p.blurb}</p>
              <button type="button" className="btn btn-ghost text-xs min-h-9 px-3" disabled>
                {vpn.data?.ready ? "Catalog not wired yet" : "Coming when Admin adds a key"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
