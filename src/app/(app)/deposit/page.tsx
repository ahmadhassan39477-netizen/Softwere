"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MessageCircle, ShieldCheck, Wallet } from "lucide-react";
import { buildDepositPrefill } from "@/lib/whatsapp-copy";
import { statusColor } from "@/lib/utils";

const PRESETS = [5, 10, 25, 50, 100] as const;

type WaLine = {
  number: string;
  display: string;
  localDisplay: string | null;
  sampleChatUrl?: string;
};

export default function DepositPage() {
  const { data: session, status, update } = useSession();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("10");

  const config = useQuery({
    queryKey: ["deposit-config"],
    enabled: status === "authenticated",
    queryFn: async () => {
      const res = await fetch("/api/deposit/config");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        balance: string;
        whatsappConfigured: boolean;
        whatsappNumber: string | null;
        whatsappDisplay?: string;
        whatsappNumbers?: WaLine[];
        instructions: string;
      }>;
    },
  });

  const history = useQuery({
    queryKey: ["wallet-history"],
    enabled: status === "authenticated",
    queryFn: async () => {
      const res = await fetch("/api/wallet/deposit");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const balanceLabel = useMemo(() => {
    const b = config.data?.balance ?? session?.user?.balance;
    if (b == null || b === "") return "$0.0000";
    const n = Number(b);
    if (Number.isFinite(n)) return `$${n.toFixed(4)}`;
    return `$${String(b)}`;
  }, [config.data?.balance, session?.user?.balance]);

  const waLines = useMemo((): WaLine[] => {
    if (config.data?.whatsappNumbers?.length) return config.data.whatsappNumbers;
    if (config.data?.whatsappNumber) {
      return [
        {
          number: config.data.whatsappNumber,
          display: config.data.whatsappDisplay ?? `+${config.data.whatsappNumber}`,
          localDisplay: null,
        },
      ];
    }
    return [];
  }, [config.data]);

  const email = session?.user?.email ?? "";
  const prefill = useMemo(() => buildDepositPrefill(amount, email), [amount, email]);

  if (status === "unauthenticated") {
    return (
      <div className="panel p-8 text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold">Deposit</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          Create an account or sign in to add wallet credit.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="btn btn-primary inline-flex">
            Create account
          </Link>
          <Link href="/login" className="btn btn-ghost inline-flex">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="eyebrow mb-2">Wallet</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Deposit</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Current balance:{" "}
          <span className="mono-data text-[var(--accent)]">{balanceLabel}</span>
        </p>
      </div>

      <div className="panel panel-accent p-5 space-y-5">
        <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle size={14} className="text-[var(--accent)]" /> WhatsApp credit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[var(--accent)]" /> Confirmed before credit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wallet size={14} className="text-[var(--accent)]" /> No card stored here
          </span>
        </div>

        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          {config.data?.instructions ??
            "Message us on WhatsApp to add credit. Include your account email and the amount you paid. Balance updates after we confirm payment — nothing is credited automatically."}
        </p>

        <div>
          <p className="text-sm font-medium mb-2">WhatsApp numbers</p>
          <ul className="space-y-2">
            {waLines.map((line) => {
              const href = `https://wa.me/${line.number}?text=${encodeURIComponent(prefill)}`;
              return (
                <li key={line.number}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-3 hover:border-[var(--accent)] transition-colors"
                  >
                    <MessageCircle size={16} className="text-[var(--accent)] shrink-0" />
                    <span className="mono-data text-[var(--accent)] font-semibold">
                      {line.localDisplay ?? line.display}
                    </span>
                    {line.localDisplay && (
                      <span className="text-xs text-[var(--text-muted)] mono-data">
                        {line.display}
                      </span>
                    )}
                    <span className="text-xs text-[var(--accent)] ml-auto">Open chat →</span>
                  </a>
                </li>
              );
            })}
            {waLines.length === 0 && (
              <li className="text-sm text-[var(--text-muted)]">Loading WhatsApp…</li>
            )}
          </ul>
        </div>

        <div>
          <label className="text-sm text-[var(--text-muted)]">Amount you plan to send (USD)</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={`btn text-sm px-3 py-1.5 ${
                  Number(amount) === p ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => setAmount(String(p))}
              >
                ${p}
              </button>
            ))}
          </div>
          <input
            className="input mt-3"
            type="number"
            min={1}
            max={5000}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {waLines[0] ? (
          <a
            className="btn btn-primary w-full sm:w-auto inline-flex justify-center gap-2"
            href={`https://wa.me/${waLines[0].number}?text=${encodeURIComponent(prefill)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={16} /> Open WhatsApp to deposit $
            {Number.isFinite(Number(amount)) ? Number(amount).toFixed(2) : amount}
          </a>
        ) : (
          <button type="button" className="btn btn-primary" disabled>
            Loading WhatsApp…
          </button>
        )}

        <ol className="text-sm text-[var(--text-muted)] space-y-2 list-decimal pl-5">
          <li>Tap a WhatsApp number (message includes your email + amount).</li>
          <li>Send payment using the method we share in chat.</li>
          <li>Wait for confirmation — your balance updates after we credit your wallet.</li>
        </ol>

        <button
          type="button"
          className="btn btn-ghost text-sm"
          onClick={() => {
            update();
            qc.invalidateQueries({ queryKey: ["deposit-config"] });
            qc.invalidateQueries({ queryKey: ["wallet-history"] });
          }}
        >
          Refresh balance
        </button>
      </div>

      <div className="panel overflow-x-auto">
        <h2 className="font-semibold p-4 pb-2">Recent wallet activity</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="p-3">Type</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Method</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {(history.data?.transactions ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-[var(--text-muted)]">
                  No deposits yet.
                </td>
              </tr>
            )}
            {(history.data?.transactions ?? []).map(
              (t: {
                id: string;
                type: string;
                amount: string;
                method: string;
                status: string;
                createdAt: string;
              }) => (
                <tr key={t.id} className="border-b border-[var(--border)]">
                  <td className="p-3">{t.type}</td>
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
