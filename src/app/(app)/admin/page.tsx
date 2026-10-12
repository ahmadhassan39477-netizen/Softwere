"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const qc = useQueryClient();

  const stats = useQuery({
    queryKey: ["admin-stats"],
    enabled: status === "authenticated" && session?.user?.role === "ADMIN",
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Forbidden");
      return res.json();
    },
  });

  const providers = useQuery({
    queryKey: ["admin-providers"],
    enabled: status === "authenticated" && session?.user?.role === "ADMIN",
    queryFn: async () => {
      const res = await fetch("/api/admin/providers");
      if (!res.ok) throw new Error("Forbidden");
      return res.json();
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

  const toggleProvider = useMutation({
    mutationFn: async (payload: { key: string; enabled: boolean }) => {
      const res = await fetch("/api/admin/providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-providers"] }),
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
        <p className="text-sm text-[var(--text-muted)] mt-2">Your account does not have admin access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-[var(--text-muted)]">Dashboard, providers, and users.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Users", value: stats.data?.users },
          { label: "Orders", value: stats.data?.orders },
          { label: "Active", value: stats.data?.activeOrders },
          { label: "Deposits", value: stats.data?.depositVolume ? `$${stats.data.depositVolume}` : "—" },
        ].map((c) => (
          <div key={c.label} className="panel p-4">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{c.label}</div>
            <div className="text-2xl font-bold mt-1">{c.value ?? "…"}</div>
          </div>
        ))}
      </div>

      <div className="panel p-5">
        <h2 className="font-semibold mb-3">SMS providers</h2>
        <div className="space-y-2">
          {(providers.data?.providers ?? []).map(
            (p: { key: string; name: string; enabled: boolean; hasApiKey: boolean }) => (
              <div key={p.key} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {p.key} · API key {p.hasApiKey ? "set" : "missing"}
                  </div>
                </div>
                <button
                  className={`btn text-xs ${p.enabled ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => toggleProvider.mutate({ key: p.key, enabled: !p.enabled })}
                >
                  {p.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            ),
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Live keys live in env / ProviderConfig — mock adapter is default when USE_MOCK_PROVIDERS=true.
        </p>
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
              (u: { id: string; email: string; role: string; balance: string; orderCount: number }) => (
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
