"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { statusColor } from "@/lib/utils";

const METHODS = [
  { id: "mock_instant", label: "Mock instant (dev)" },
  { id: "crypto_nowpayments", label: "Crypto — NOWPayments" },
  { id: "crypto_cryptomus", label: "Crypto — Cryptomus" },
  { id: "binance_pay", label: "Binance Pay (manual)" },
  { id: "perfect_money", label: "Perfect Money (manual)" },
  { id: "manual", label: "Local transfer (admin approval)" },
] as const;

export default function DepositPage() {
  const { data: session, status, update } = useSession();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("10");
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("mock_instant");
  const [message, setMessage] = useState("");

  const history = useQuery({
    queryKey: ["wallet-history"],
    enabled: status === "authenticated",
    queryFn: async () => {
      const res = await fetch("/api/wallet/deposit");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const deposit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: async (data) => {
      setMessage(
        data.intent?.status === "COMPLETED"
          ? `Credited $${data.balance}`
          : `Pending payment ${data.intent?.payAddress ?? data.intent?.id}`,
      );
      await update();
      qc.invalidateQueries({ queryKey: ["wallet-history"] });
    },
    onError: (e: Error) => setMessage(e.message),
  });

  if (status === "unauthenticated") {
    return (
      <div className="panel p-8 text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <Link href="/login" className="btn btn-primary mt-6 inline-flex">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="eyebrow mb-2">Wallet</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Deposit</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Balance:{" "}
          <span className="mono-data text-[var(--accent)]">${session?.user?.balance}</span>
        </p>
      </div>

      <div className="panel panel-accent p-5 space-y-4">
        <div>
          <label className="text-sm text-[var(--text-muted)]">Amount (USD)</label>
          <input
            className="input mt-1"
            type="number"
            min={0.1}
            step={0.0001}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-[var(--text-muted)]">Method</label>
          <select
            className="input mt-1"
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
          >
            {METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" disabled={deposit.isPending} onClick={() => deposit.mutate()}>
          {deposit.isPending ? "Processing…" : "Continue"}
        </button>
        {message && <p className="text-sm text-[var(--accent-2)]">{message}</p>}
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="p-3">ID</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Method</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {(history.data?.transactions ?? []).map(
              (t: {
                id: string;
                amount: string;
                method: string;
                status: string;
                createdAt: string;
              }) => (
                <tr key={t.id} className="border-b border-[var(--border)]">
                  <td className="p-3 font-mono text-xs">{t.id.slice(0, 10)}…</td>
                  <td className="p-3 font-mono">${t.amount}</td>
                  <td className="p-3">{t.method}</td>
                  <td className="p-3">
                    <span className={`badge ${statusColor(t.status)}`}>{t.status}</span>
                  </td>
                  <td className="p-3 text-[var(--text-muted)]">
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
