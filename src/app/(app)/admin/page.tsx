"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

type ProviderRow = {
  key: string;
  name: string;
  enabled: boolean;
  priority: number;
  markupPercent: string;
  hasApiKey: boolean;
  apiKeyMasked: string;
  balance: number | null;
  envConfigured: boolean;
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const qc = useQueryClient();
  const [markup, setMarkup] = useState("20");
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const stats = useQuery({
    queryKey: ["admin-stats"],
    enabled: status === "authenticated" && session?.user?.role === "ADMIN",
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Forbidden");
      return res.json();
    },
  });

  const settings = useQuery({
    queryKey: ["admin-provider-settings"],
    enabled: status === "authenticated" && session?.user?.role === "ADMIN",
    queryFn: async () => {
      const res = await fetch("/api/admin/provider-settings");
      if (!res.ok) throw new Error("Forbidden");
      return res.json() as Promise<{
        markupPercent: string;
        providers: ProviderRow[];
      }>;
    },
  });

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: status === "authenticated" && session?.user?.role === "ADMIN",
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Forbidden");
      return res.json();
    },
  });

  useEffect(() => {
    if (settings.data?.markupPercent) setMarkup(settings.data.markupPercent);
  }, [settings.data?.markupPercent]);

  const patch = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/admin/provider-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      return data;
    },
    onSuccess: () => {
      setMsg("Saved.");
      setKeyDrafts({});
      qc.invalidateQueries({ queryKey: ["admin-provider-settings"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  if (status === "unauthenticated") {
    return (
      <div className="panel p-8 text-center">
        <Link href="/login" className="btn btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="panel p-8 text-center">
        <h1 className="text-xl font-bold">Admin only</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          Your account does not have admin access.
        </p>
      </div>
    );
  }

  const providers = settings.data?.providers ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Wholesale API keys, markup, provider balances, and server toggles.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Users", value: stats.data?.users },
          { label: "Orders", value: stats.data?.orders },
          { label: "Active", value: stats.data?.activeOrders },
          {
            label: "Deposits",
            value: stats.data?.depositVolume ? `$${stats.data.depositVolume}` : "—",
          },
        ].map((c) => (
          <div key={c.label} className="panel p-4">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{c.label}</div>
            <div className="text-2xl font-bold mt-1">{c.value ?? "…"}</div>
          </div>
        ))}
      </div>

      <div className="panel p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div>
            <h2 className="font-semibold">Global retail markup</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Retail = wholesale × (1 + markup%). Current:{" "}
              {settings.data?.markupPercent ?? "…"}%
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              className="input w-24"
              type="number"
              min={0}
              max={500}
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              placeholder="20"
            />
            <span className="text-sm text-[var(--text-muted)]">%</span>
            <button
              type="button"
              className="btn btn-primary text-sm"
              disabled={patch.isPending}
              onClick={() =>
                patch.mutate({
                  key: providers[0]?.key ?? "sms-activate",
                  globalMarkupPercent: Number(markup),
                })
              }
            >
              Save markup
            </button>
          </div>
        </div>
        {msg && <p className="text-sm text-[var(--accent)]">{msg}</p>}
      </div>

      <div className="panel p-5">
        <h2 className="font-semibold mb-1">SMS providers (Server 1 → 2 → 3)</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Paste keys you buy from each wholesale site. Never share keys in chat. Env vars also
          work: SMS_ACTIVATE_API_KEY, FIVESIM_API_KEY, GRIZZLY_SMS_API_KEY.
        </p>
        <div className="space-y-4">
          {providers.map((p) => (
            <div
              key={p.key}
              className="rounded-xl border border-[var(--border)] px-4 py-3 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">
                    Server {p.priority}: {p.name}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {p.key} · key {p.hasApiKey ? p.apiKeyMasked : "not set"}
                    {p.envConfigured ? " · env OK" : ""} · balance{" "}
                    {p.balance != null ? `$${p.balance}` : "—"}
                  </div>
                </div>
                <button
                  type="button"
                  className={`btn text-xs ${p.enabled ? "btn-primary" : "btn-ghost"}`}
                  disabled={patch.isPending}
                  onClick={() => patch.mutate({ key: p.key, enabled: !p.enabled })}
                >
                  {p.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  className="input flex-1 min-w-[200px] font-mono text-sm"
                  type="password"
                  autoComplete="off"
                  placeholder={`Paste ${p.name} API key`}
                  value={keyDrafts[p.key] ?? ""}
                  onChange={(e) =>
                    setKeyDrafts((prev) => ({ ...prev, [p.key]: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="btn btn-ghost text-sm"
                  disabled={patch.isPending || !(keyDrafts[p.key] ?? "").trim()}
                  onClick={() =>
                    patch.mutate({
                      key: p.key,
                      apiKey: (keyDrafts[p.key] ?? "").trim() || null,
                    })
                  }
                >
                  Save key
                </button>
                {p.hasApiKey && (
                  <button
                    type="button"
                    className="btn btn-ghost text-sm text-[#fca5a5]"
                    disabled={patch.isPending}
                    onClick={() => patch.mutate({ key: p.key, apiKey: null })}
                  >
                    Clear key
                  </button>
                )}
              </div>
            </div>
          ))}
          {providers.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">Loading providers…</p>
          )}
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <h2 className="font-semibold p-4 pb-0">Users</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Balance</th>
              <th className="p-3">Orders</th>
            </tr>
          </thead>
          <tbody>
            {(users.data?.users ?? []).map(
              (u: {
                id: string;
                email: string;
                role: string;
                balance: string;
                orderCount: number;
              }) => (
                <tr key={u.id} className="border-b border-[var(--border)]">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3 font-mono">${u.balance}</td>
                  <td className="p-3">{u.orderCount}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
