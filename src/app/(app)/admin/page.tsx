"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";

type ProviderRow = {
  key: string;
  name: string;
  slot?: number;
  providerType?: string;
  providerLabel?: string;
  baseUrl?: string | null;
  enabled: boolean;
  priority: number;
  markupPercent: string;
  hasApiKey: boolean;
  apiKeyMasked: string;
  balance: number | null;
  envConfigured: boolean;
  envJunkUrl?: boolean;
  buyReady?: boolean;
  buyBlockedReason?: "off" | "no_key" | "no_balance" | null;
  tokenLooksLikeDocsUrl?: boolean;
  live?: boolean | null;
  livePriceRows?: number | null;
};

type ProviderTypeOption = { value: string; label: string; defaultMarkup: number };

/** Always shown in Admin — never rely on a stale API payload alone. */
const ADMIN_PROVIDER_TYPES: ProviderTypeOption[] = [
  { value: "sms-activate", label: "SMS-Activate", defaultMarkup: 20 },
  { value: "5sim", label: "5SIM", defaultMarkup: 20 },
  { value: "grizzlysms", label: "Grizzly SMS", defaultMarkup: 20 },
  { value: "smsbower", label: "SMSBower", defaultMarkup: 20 },
  { value: "sms-man", label: "SMS-Man", defaultMarkup: 20 },
  { value: "custom-sa", label: "Custom (SMS-Activate API)", defaultMarkup: 20 },
];

function mergeProviderTypes(fromApi?: ProviderTypeOption[]): ProviderTypeOption[] {
  const byValue = new Map<string, ProviderTypeOption>();
  for (const t of ADMIN_PROVIDER_TYPES) byValue.set(t.value, t);
  for (const t of fromApi ?? []) {
    if (!byValue.has(t.value)) byValue.set(t.value, t);
  }
  // SMSBower (Server 3 Extra default) after Grizzly; SMS-Man kept as optional
  const order = [
    "sms-activate",
    "5sim",
    "grizzlysms",
    "smsbower",
    "sms-man",
    "custom-sa",
  ];
  const ordered: ProviderTypeOption[] = [];
  for (const v of order) {
    const hit = byValue.get(v);
    if (hit) {
      ordered.push(hit);
      byValue.delete(v);
    }
  }
  for (const t of byValue.values()) ordered.push(t);
  return ordered;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const qc = useQueryClient();
  const [markup, setMarkup] = useState("20");
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [markupDrafts, setMarkupDrafts] = useState<Record<string, string>>({});
  const [baseUrlDrafts, setBaseUrlDrafts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [waNumber, setWaNumber] = useState("923153378418");
  const [creditEmail, setCreditEmail] = useState("");
  const [creditAmount, setCreditAmount] = useState("10");
  const [creditNote, setCreditNote] = useState("");
  const [walletDirection, setWalletDirection] = useState<"credit" | "debit">("credit");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [vpnKey, setVpnKey] = useState("");
  const [vpnSecret, setVpnSecret] = useState("");
  const [vpnEnabled, setVpnEnabled] = useState(true);
  const [vpnMarkup, setVpnMarkup] = useState("20");
  const [vpnDisplay, setVpnDisplay] = useState("VPN & Proxy");
  const [vpnBase, setVpnBase] = useState("https://api.proxy-cheap.com");
  const [keyFieldUnlocked, setKeyFieldUnlocked] = useState<Record<string, boolean>>({});
  const [repairTried, setRepairTried] = useState(false);

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
      const res = await fetch("/api/admin/provider-settings?probe=1");
      if (!res.ok) throw new Error("Forbidden");
      return res.json() as Promise<{
        markupPercent: string;
        providers: ProviderRow[];
        providerTypes?: ProviderTypeOption[];
        grizzlyDefaultMarkup?: number;
        liveProbe?: Record<
          string,
          {
            liveRows: number;
            whatsappWholesale: number | null;
            whatsappRetail: number | null;
            live: boolean;
          }
        >;
      }>;
    },
  });

  const whatsapp = useQuery({
    queryKey: ["admin-whatsapp"],
    enabled: status === "authenticated" && session?.user?.role === "ADMIN",
    queryFn: async () => {
      const res = await fetch("/api/admin/whatsapp");
      if (!res.ok) throw new Error("Forbidden");
      return res.json() as Promise<{
        number: string | null;
        numbers?: string[];
        configured: boolean;
      }>;
    },
  });

  const vpn = useQuery({
    queryKey: ["admin-vpn"],
    enabled: status === "authenticated" && session?.user?.role === "ADMIN",
    queryFn: async () => {
      const res = await fetch("/api/admin/vpn?probe=1");
      if (!res.ok) throw new Error("Forbidden");
      return res.json() as Promise<{
        provider: string;
        displayName: string;
        baseUrl: string;
        enabled: boolean;
        markupPercent: number;
        hasApiKey: boolean;
        apiKeyMasked: string;
        hasApiSecret: boolean;
        apiSecretMasked: string;
        ready: boolean;
        live: boolean | null;
        livePlanCount: number | null;
        balance: number | null;
        probeError: string | null;
      }>;
    },
  });

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: status === "authenticated" && session?.user?.role === "ADMIN",
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Forbidden");
      return res.json() as Promise<{
        users: Array<{
          id: string;
          email: string;
          role: string;
          balance: string;
          orderCount: number;
          otpRequested: number;
          otpSuccessful: number;
        }>;
      }>;
    },
  });

  const userDetail = useQuery({
    queryKey: ["admin-user-detail", expandedUserId],
    enabled:
      status === "authenticated" &&
      session?.user?.role === "ADMIN" &&
      Boolean(expandedUserId),
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/users?userId=${encodeURIComponent(expandedUserId!)}`,
      );
      if (!res.ok) throw new Error("Failed to load user orders");
      return res.json() as Promise<{
        user: {
          id: string;
          email: string;
          balance: string;
          otpRequested: number;
          otpSuccessful: number;
        };
        orders: Array<{
          id: string;
          status: string;
          hasOtp: boolean;
          phoneMasked: string | null;
          price: string;
          createdAt: string;
          country: { code: string; flag: string; name: string };
          service: { name: string; slug: string };
        }>;
      }>;
    },
  });

  useEffect(() => {
    if (settings.data?.markupPercent) setMarkup(settings.data.markupPercent);
  }, [settings.data?.markupPercent]);

  useEffect(() => {
    if (!settings.data?.providers) return;
    setMarkupDrafts((prev) => {
      const next = { ...prev };
      for (const p of settings.data.providers) {
        if (next[p.key] === undefined) next[p.key] = p.markupPercent;
      }
      return next;
    });
    setBaseUrlDrafts((prev) => {
      const next = { ...prev };
      for (const p of settings.data.providers) {
        if (next[p.key] === undefined) next[p.key] = p.baseUrl ?? "";
      }
      return next;
    });
  }, [settings.data?.providers]);

  useEffect(() => {
    if (!vpn.data) return;
    setVpnDisplay(vpn.data.displayName);
    setVpnBase(vpn.data.baseUrl || "https://api.proxy-cheap.com");
    setVpnEnabled(vpn.data.enabled);
    setVpnMarkup(String(vpn.data.markupPercent ?? 20));
  }, [vpn.data]);

  useEffect(() => {
    if (whatsapp.data?.numbers?.length) {
      setWaNumber(whatsapp.data.numbers.join(", "));
    } else if (whatsapp.data?.number) {
      setWaNumber(whatsapp.data.number);
    }
  }, [whatsapp.data?.number, whatsapp.data?.numbers]);

  const patch = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/admin/provider-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      return data as {
        provider?: {
          key: string;
          enabled: boolean;
          hasApiKey: boolean;
          apiKeyMasked?: string;
          balance?: number | null;
          buyReady?: boolean;
        };
      };
    },
    onMutate: async (payload) => {
      // Optimistic Enable/Disable so the button does not snap back while probe refetch runs
      if (typeof payload.enabled !== "boolean" || typeof payload.key !== "string") {
        return undefined;
      }
      await qc.cancelQueries({ queryKey: ["admin-provider-settings"] });
      const prev = qc.getQueryData(["admin-provider-settings"]);
      qc.setQueryData(["admin-provider-settings"], (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const data = old as { providers?: ProviderRow[] };
        if (!Array.isArray(data.providers)) return old;
        return {
          ...data,
          providers: data.providers.map((p) =>
            p.key === payload.key ? { ...p, enabled: payload.enabled as boolean } : p,
          ),
        };
      });
      return { prev };
    },
    onSuccess: (data, payload) => {
      const savedKeyOk =
        payload.apiKey !== undefined && Boolean(data.provider?.hasApiKey);
      setMsg(
        typeof payload.enabled === "boolean"
          ? payload.enabled
            ? "Enabled — stays on after refresh when a valid key is saved."
            : "Disabled."
          : savedKeyOk
            ? `Key saved on ${data.provider?.key ?? "slot"} — stays after refresh.`
            : payload.apiKey !== undefined
              ? "Save did not store a key (rejected)."
              : "Saved.",
      );
      // Only clear draft after a confirmed store — keep text on reject so she can see what failed
      if (savedKeyOk && typeof payload.key === "string") {
        setKeyDrafts((prev) => {
          const next = { ...prev };
          delete next[payload.key as string];
          return next;
        });
      }
      // Keep optimistic slot state from PATCH before slow probe=1 refetch
      if (data.provider?.key) {
        qc.setQueryData(["admin-provider-settings"], (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const cur = old as { providers?: ProviderRow[] };
          if (!Array.isArray(cur.providers)) return old;
          return {
            ...cur,
            providers: cur.providers.map((p) =>
              p.key === data.provider!.key
                ? {
                    ...p,
                    enabled: data.provider!.enabled,
                    hasApiKey: data.provider!.hasApiKey || p.hasApiKey,
                    apiKeyMasked:
                      data.provider!.apiKeyMasked ??
                      (data.provider!.hasApiKey ? p.apiKeyMasked : p.apiKeyMasked),
                    balance:
                      data.provider!.balance !== undefined
                        ? data.provider!.balance
                        : p.balance,
                    buyReady:
                      data.provider!.buyReady !== undefined
                        ? data.provider!.buyReady
                        : p.buyReady,
                    buyBlockedReason: data.provider!.hasApiKey
                      ? data.provider!.buyReady
                        ? null
                        : "no_balance"
                      : "no_key",
                  }
                : p,
            ),
          };
        });
      }
      qc.invalidateQueries({ queryKey: ["admin-provider-settings"] });
    },
    onError: (e: Error, _payload, ctx) => {
      if (ctx && typeof ctx === "object" && "prev" in ctx && ctx.prev !== undefined) {
        qc.setQueryData(["admin-provider-settings"], ctx.prev);
      }
      // Keep key draft so a rejected paste is visible; do not claim Saved
      setMsg(e.message);
    },
  });

  const repairKeys = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/repair-provider-keys", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Repair failed");
      return data as {
        ok?: boolean;
        results?: Record<
          string,
          { repaired?: boolean; masked?: string; balance?: number | null; note?: string; source?: string }
        >;
      };
    },
    onSuccess: (data) => {
      const s1 = data.results?.["server-1"];
      if (s1?.repaired) {
        setMsg(
          `Server 1 repaired from ${s1.source ?? "stored key"}${
            s1.balance != null ? ` · $${s1.balance}` : ""
          }`,
        );
      } else {
        setMsg(s1?.note ?? "Repair finished — no usable 5SIM token found in DB.");
      }
      qc.invalidateQueries({ queryKey: ["admin-provider-settings"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  // One auto-repair when Server 1 is Enabled but empty (owner should not re-paste)
  useEffect(() => {
    if (repairTried) return;
    const s1 = settings.data?.providers?.find((p) => p.key === "server-1");
    if (!s1 || s1.hasApiKey || !s1.enabled) return;
    setRepairTried(true);
    void fetch("/api/admin/repair-provider-keys", { method: "POST" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          results?: Record<
            string,
            { repaired?: boolean; masked?: string; balance?: number | null; note?: string; source?: string }
          >;
        };
        const s1r = data.results?.["server-1"];
        if (s1r?.repaired) {
          setMsg(
            `Server 1 repaired from ${s1r.source ?? "stored key"}${
              s1r.balance != null ? ` · $${s1r.balance}` : ""
            }`,
          );
        }
        await qc.invalidateQueries({ queryKey: ["admin-provider-settings"] });
      })
      .catch(() => undefined);
  }, [settings.data?.providers, repairTried, qc]);

  const saveWa = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: waNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      return data;
    },
    onSuccess: () => {
      setMsg("WhatsApp numbers saved.");
      qc.invalidateQueries({ queryKey: ["admin-whatsapp"] });
      qc.invalidateQueries({ queryKey: ["deposit-config"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const saveVpn = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/admin/vpn", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      return data;
    },
    onSuccess: () => {
      setMsg("Proxy Cheap settings saved.");
      setVpnKey("");
      setVpnSecret("");
      qc.invalidateQueries({ queryKey: ["admin-vpn"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const credit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/wallet-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: creditEmail.trim(),
          amount: Number(creditAmount),
          direction: walletDirection,
          note:
            creditNote.trim() ||
            (walletDirection === "debit"
              ? "Admin balance cut"
              : "WhatsApp payment confirmed"),
          idempotencyKey:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${creditEmail.trim()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Wallet adjust failed");
      return data as {
        direction: string;
        user: { email: string; balance: string };
        credited?: string;
        debited?: string;
        clamped?: boolean;
        idempotent?: boolean;
      };
    },
    onSuccess: (data) => {
      if (data.direction === "debit") {
        setMsg(
          `Debited $${data.debited} from ${data.user.email}. New balance $${data.user.balance}${
            data.clamped ? " (clamped at $0)" : ""
          }`,
        );
      } else {
        setMsg(
          `Credited $${data.credited} to ${data.user.email}. New balance $${data.user.balance}`,
        );
      }
      setCreditNote("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      if (expandedUserId) {
        qc.invalidateQueries({ queryKey: ["admin-user-detail", expandedUserId] });
      }
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
          WhatsApp deposit number, wallet top-ups, wholesale keys, and markup.
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

      {msg && <p className="text-sm text-[var(--accent)]">{msg}</p>}

      <div className="panel p-5 space-y-4">
        <h2 className="font-semibold">Deposit WhatsApp numbers</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Customers see this number on Deposit. Default: 923153378418 / 03153378418.
          Env: WHATSAPP_BUSINESS_NUMBER.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-[240px] font-mono text-sm"
            value={waNumber}
            onChange={(e) => setWaNumber(e.target.value)}
            placeholder="923153378418"
          />
          <button
            type="button"
            className="btn btn-primary text-sm"
            disabled={saveWa.isPending}
            onClick={() => saveWa.mutate()}
          >
            Save numbers
          </button>
        </div>
      </div>

      <div className="panel p-5 space-y-4" data-testid="admin-vpn-proxy">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Proxy Cheap</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Provider: <span className="font-medium text-[var(--text)]">Proxy Cheap</span>.
              Paste the API key and API user / secret from your Proxy Cheap dashboard. Same
              enable + margin pattern as SMS slots. Keys stay here — never in chat.
            </p>
          </div>
          <button
            type="button"
            className={`btn text-xs ${vpnEnabled ? "btn-primary" : "btn-ghost"}`}
            disabled={saveVpn.isPending}
            onClick={() => {
              const next = !vpnEnabled;
              setVpnEnabled(next);
              saveVpn.mutate({ enabled: next, displayName: vpnDisplay, baseUrl: vpnBase });
            }}
          >
            {vpnEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)]" data-testid="admin-proxycheap-masked">
          {vpn.data?.hasApiKey
            ? `Key on file: ${vpn.data.apiKeyMasked}`
            : "No API key yet."}
          {" · "}
          {vpn.data?.hasApiSecret
            ? `User on file: ${vpn.data.apiSecretMasked}`
            : "No API user / secret yet."}
          {vpn.data?.live === true
            ? ` · live catalog OK (${vpn.data.livePlanCount ?? 0} plans)`
            : vpn.data?.live === false
              ? " · catalog not reachable yet"
              : ""}
          {vpn.data?.balance != null ? ` · balance $${vpn.data.balance}` : ""}
        </p>
        {vpn.data?.probeError && !/rfc2616|<!doctype|\{"type"/i.test(vpn.data.probeError) ? (
          <p className="text-xs text-amber-400">{vpn.data.probeError}</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-[var(--text-muted)]" htmlFor="vpn-display">
              Customer display name
            </label>
            <input
              id="vpn-display"
              className="input mt-1"
              value={vpnDisplay}
              onChange={(e) => setVpnDisplay(e.target.value)}
              placeholder="VPN & Proxy"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]" htmlFor="vpn-markup">
              Margin % (retail = wholesale × 1 + %)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="vpn-markup"
                className="input w-24"
                type="number"
                min={0}
                max={500}
                value={vpnMarkup}
                onChange={(e) => setVpnMarkup(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost text-sm"
                disabled={saveVpn.isPending}
                onClick={() =>
                  saveVpn.mutate({
                    markupPercent: Number(vpnMarkup),
                    displayName: vpnDisplay,
                    baseUrl: vpnBase,
                    enabled: vpnEnabled,
                  })
                }
              >
                Save margin
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]" htmlFor="vpn-base">
            API base URL (optional)
          </label>
          <input
            id="vpn-base"
            className="input mt-1 font-mono text-sm"
            value={vpnBase}
            onChange={(e) => setVpnBase(e.target.value)}
            placeholder="https://api.proxy-cheap.com"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-[var(--text-muted)]" htmlFor="vpn-api-key">
              API key
            </label>
            <input
              id="vpn-api-key"
              className="input mt-1 font-mono text-sm"
              type="password"
              autoComplete="off"
              value={vpnKey}
              onChange={(e) => setVpnKey(e.target.value)}
              placeholder="Paste API key"
              data-testid="admin-proxycheap-key"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]" htmlFor="vpn-api-user">
              API user / secret
            </label>
            <input
              id="vpn-api-user"
              className="input mt-1 font-mono text-sm"
              type="password"
              autoComplete="off"
              value={vpnSecret}
              onChange={(e) => setVpnSecret(e.target.value)}
              placeholder="Paste API user or secret"
              data-testid="admin-proxycheap-user"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary text-sm"
            disabled={saveVpn.isPending}
            onClick={() =>
              saveVpn.mutate({
                apiKey: vpnKey.trim() || undefined,
                apiSecret: vpnSecret.trim() || undefined,
                provider: "Proxy Cheap",
                displayName: vpnDisplay,
                baseUrl: vpnBase,
                enabled: vpnEnabled,
                markupPercent: Number(vpnMarkup),
                probe: true,
              })
            }
          >
            Save
          </button>
          {(vpn.data?.hasApiKey || vpn.data?.hasApiSecret) && (
            <button
              type="button"
              className="btn btn-ghost text-sm"
              disabled={saveVpn.isPending}
              onClick={() => saveVpn.mutate({ clearKey: true, clearSecret: true })}
            >
              Clear key
            </button>
          )}
        </div>
      </div>

      <div className="panel p-5 space-y-4">
        <h2 className="font-semibold">Wallet credit / debit</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Credit after WhatsApp payment. Debit to cut mistaken top-ups (balance floors at $0;
          ADJUSTMENT ledger row with your note).
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["credit", "Credit (deposit)"],
              ["debit", "Debit (cut balance)"],
            ] as const
          ).map(([dir, label]) => (
            <button
              key={dir}
              type="button"
              className={`btn text-sm ${walletDirection === dir ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setWalletDirection(dir)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Customer email</label>
            <input
              className="input mt-1"
              type="email"
              value={creditEmail}
              onChange={(e) => setCreditEmail(e.target.value)}
              placeholder="customer@email.com"
              list="admin-user-emails"
            />
            <datalist id="admin-user-emails">
              {(users.data?.users ?? []).map((u) => (
                <option key={u.email} value={u.email} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Amount (USD)</label>
            <input
              className="input mt-1"
              type="number"
              min={0.01}
              step={0.01}
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Note (optional)</label>
          <input
            className="input mt-1"
            value={creditNote}
            onChange={(e) => setCreditNote(e.target.value)}
            placeholder={
              walletDirection === "debit"
                ? "Mistake top-up / correction"
                : "WhatsApp payment confirmed"
            }
          />
        </div>
        <button
          type="button"
          className={walletDirection === "debit" ? "btn btn-danger" : "btn btn-primary"}
          disabled={credit.isPending || !creditEmail.trim() || Number(creditAmount) <= 0}
          onClick={() => credit.mutate()}
        >
          {credit.isPending
            ? walletDirection === "debit"
              ? "Debiting…"
              : "Crediting…"
            : walletDirection === "debit"
              ? "Debit wallet"
              : "Credit wallet"}
        </button>
      </div>

      <div className="panel p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div>
            <h2 className="font-semibold">Global retail markup</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Retail = wholesale × (1 + markup%). Current: {settings.data?.markupPercent ?? "…"}%
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
      </div>

      <div className="panel p-5" data-testid="admin-server-slots">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold mb-1">SMS providers — Server 1 / 2 / 3</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Defaults: Server 1 = 5SIM, Server 2 = Grizzly, Server 3 = SMSBower (Extra). Margin{" "}
              {settings.data?.grizzlyDefaultMarkup ?? 20}% (retail = wholesale × 1.20). A saved
              key stays after refresh; URL/docs pastes are rejected. Customer /services never
              shows wholesale brand names. Keys stay in Admin — never in chat. Paste the full
              SMSBower api_key on Server 3 (not a handler URL, not a chat-masked fragment).
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost text-sm"
            disabled={repairKeys.isPending}
            onClick={() => repairKeys.mutate()}
          >
            {repairKeys.isPending ? "Repairing…" : "Repair empty keys"}
          </button>
        </div>
        <div className="space-y-4">
          {providers.map((p) => {
            const types = mergeProviderTypes(settings.data?.providerTypes);
            const type = p.providerType ?? "sms-activate";
            const keyPlaceholder =
              type === "smsbower"
                ? "Paste full SMSBower api_key (not handler URL / not chat-masked *)"
                : type === "sms-man"
                  ? "Paste SMS-Man profile token (not a get-sms URL)"
                  : type === "5sim"
                    ? "Paste 5SIM API key from profile/settings (not a URL)"
                    : `Paste ${p.providerLabel ?? "provider"} API key`;
            return (
              <div
                key={p.key}
                data-server-slot={p.slot ?? p.priority}
                className="rounded-xl border border-[var(--border)] px-4 py-3 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      Server {p.slot ?? p.priority}
                      {p.providerLabel ? ` · ${p.providerLabel}` : ""}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {p.key} · key {p.hasApiKey ? p.apiKeyMasked : "not set"}
                      {p.envJunkUrl
                        ? " · env is URL junk (ignored)"
                        : p.envConfigured
                          ? " · env leftover (not used for buy)"
                          : ""}{" "}
                      · balance {p.balance != null ? `$${p.balance}` : "—"}
                      {p.live === true
                        ? ` · live prices OK (${p.livePriceRows ?? 0} rows)`
                        : p.live === false
                          ? " · live prices missing"
                          : ""}
                      {p.buyReady
                        ? " · buy ready"
                        : p.buyBlockedReason === "no_key" || (p.enabled && !p.hasApiKey)
                          ? " · buy blocked (no key)"
                          : p.buyBlockedReason === "no_balance" ||
                              (p.enabled && p.hasApiKey && !(Number(p.balance) > 0))
                            ? " · buy blocked (no balance)"
                            : " · buy off"}
                    </div>
                    {p.enabled && !p.hasApiKey ? (
                      <div className="text-xs text-amber-400 mt-1">
                        {type === "5sim" && p.envJunkUrl
                          ? "Server 1 has no profile API key in the database. Vercel FIVESIM env is URL junk (ignored for buy). Repair Empty Keys scans every stored slot/config for a real 5SIM token with balance."
                          : type === "5sim"
                            ? "Server 1 has no profile API key on this slot. Live prices can show from the public catalog; buy stays blocked until a real 5SIM profile token is on Server 1."
                            : p.envConfigured
                              ? "No Admin key on this slot (env leftover is not used for buy)."
                              : "Enabled but no API key on this server slot — Enable alone does not store a key."}
                      </div>
                    ) : null}
                    {p.enabled && p.hasApiKey && !(Number(p.balance) > 0) ? (
                      <div className="text-xs text-amber-400 mt-1">
                        Key is saved but wallet balance is empty — top up on the same provider
                        account as this key, then refresh Admin.
                      </div>
                    ) : null}
                    {p.tokenLooksLikeDocsUrl ? (
                      <div className="text-xs text-amber-400 mt-1">
                        Saved value looks like a URL or HTTP request — paste only the API key
                        from the provider profile/settings (not GET, http, product-balance, or
                        docs links), then Save key.
                      </div>
                    ) : null}
                    {p.enabled && p.hasApiKey && p.live === false ? (
                      <div className="text-xs text-amber-400 mt-1">
                        Enabled with a key but live prices missing — check provider balance /
                        stock, then refresh this page.
                      </div>
                    ) : null}
                    {type === "sms-man" && settings.data?.liveProbe?.[p.key] ? (
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        US WhatsApp probe:{" "}
                        {settings.data.liveProbe[p.key].live
                          ? `wholesale $${Number(
                              settings.data.liveProbe[p.key].whatsappWholesale,
                            ).toFixed(4)} → retail $${Number(
                              settings.data.liveProbe[p.key].whatsappRetail,
                            ).toFixed(4)}`
                          : "no live row yet (check token + Enabled)"}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={`btn text-xs ${p.enabled ? "btn-primary" : "btn-ghost"}`}
                    disabled={patch.isPending}
                    aria-pressed={p.enabled}
                    onClick={() => {
                      const next = !p.enabled;
                      patch.mutate({ key: p.key, enabled: next });
                    }}
                  >
                    {p.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Provider type</label>
                    <select
                      className="input mt-1"
                      value={type}
                      disabled={patch.isPending}
                      onChange={(e) => {
                        const providerType = e.target.value;
                        const opt = types.find((t) => t.value === providerType);
                        patch.mutate({
                          key: p.key,
                          providerType,
                          markupPercent: opt?.defaultMarkup ?? 20,
                        });
                      }}
                    >
                      {types.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">
                      Margin % (retail = wholesale × 1 + %)
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        className="input w-24"
                        type="number"
                        min={0}
                        max={500}
                        value={markupDrafts[p.key] ?? p.markupPercent}
                        onChange={(e) =>
                          setMarkupDrafts((prev) => ({ ...prev, [p.key]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-ghost text-sm"
                        disabled={patch.isPending}
                        onClick={() =>
                          patch.mutate({
                            key: p.key,
                            markupPercent: Number(markupDrafts[p.key] ?? p.markupPercent),
                          })
                        }
                      >
                        Save margin
                      </button>
                    </div>
                  </div>
                </div>

                {type === "custom-sa" && (
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">
                      Custom handler base URL
                    </label>
                    <input
                      className="input mt-1 font-mono text-sm"
                      placeholder="https://example.com/stubs/handler_api.php"
                      value={baseUrlDrafts[p.key] ?? ""}
                      onChange={(e) =>
                        setBaseUrlDrafts((prev) => ({ ...prev, [p.key]: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-ghost text-sm mt-2"
                      disabled={patch.isPending}
                      onClick={() =>
                        patch.mutate({
                          key: p.key,
                          baseUrl: (baseUrlDrafts[p.key] ?? "").trim() || null,
                        })
                      }
                    >
                      Save base URL
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 items-start">
                  <div className="flex-1 min-w-[200px] space-y-1">
                    {p.hasApiKey ? (
                      <div className="text-[11px] text-[var(--text-muted)] mono-data">
                        Saved on slot: {p.apiKeyMasked}
                      </div>
                    ) : null}
                    <input
                      className="input w-full font-mono text-sm"
                      type="text"
                      inputMode="text"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      name={`te-slot-key-${p.key}`}
                      id={`te-slot-key-${p.key}`}
                      data-1p-ignore="true"
                      data-lpignore="true"
                      data-form-type="other"
                      readOnly={!keyFieldUnlocked[p.key]}
                      onFocus={() =>
                        setKeyFieldUnlocked((prev) => ({ ...prev, [p.key]: true }))
                      }
                      placeholder={keyPlaceholder}
                      value={keyDrafts[p.key] ?? ""}
                      onChange={(e) =>
                        setKeyDrafts((prev) => ({ ...prev, [p.key]: e.target.value }))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost text-sm mt-0.5"
                    disabled={patch.isPending || !(keyDrafts[p.key] ?? "").trim()}
                    onClick={() => {
                      const raw = (keyDrafts[p.key] ?? "").trim();
                      if (!raw) {
                        setMsg("Nothing to save — key field is empty.");
                        return;
                      }
                      patch.mutate({
                        key: p.key,
                        apiKey: raw,
                      });
                    }}
                  >
                    Save key
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <h2 className="font-semibold p-4 pb-0">Users</h2>
        <p className="px-4 pt-1 text-xs text-[var(--text-muted)]">
          OTP requested = all buys · Successful = RECEIVED / got code. Expand a row for order
          history.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Balance</th>
              <th className="p-3">OTP req</th>
              <th className="p-3">OTP ok</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(users.data?.users ?? []).map((u) => (
              <Fragment key={u.id}>
                <tr className="border-b border-[var(--border)]">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3 font-mono">${u.balance}</td>
                  <td className="p-3 font-mono">{u.otpRequested ?? u.orderCount}</td>
                  <td className="p-3 font-mono">{u.otpSuccessful ?? 0}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      <button
                        type="button"
                        className="btn btn-ghost text-xs"
                        onClick={() =>
                          setExpandedUserId((prev) => (prev === u.id ? null : u.id))
                        }
                      >
                        {expandedUserId === u.id ? "Hide" : "Orders"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost text-xs"
                        onClick={() => {
                          setCreditEmail(u.email);
                          setWalletDirection("credit");
                        }}
                      >
                        Top up
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost text-xs"
                        onClick={() => {
                          setCreditEmail(u.email);
                          setWalletDirection("debit");
                        }}
                      >
                        Cut
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedUserId === u.id && (
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
                    <td colSpan={6} className="p-4">
                      {userDetail.isLoading && (
                        <p className="text-sm text-[var(--text-muted)]">Loading orders…</p>
                      )}
                      {userDetail.data && (
                        <div className="space-y-3">
                          <p className="text-sm">
                            <span className="font-medium">{userDetail.data.user.email}</span>
                            {" · "}
                            Requested{" "}
                            <span className="font-mono">
                              {userDetail.data.user.otpRequested}
                            </span>
                            {" · "}
                            Successful{" "}
                            <span className="font-mono">
                              {userDetail.data.user.otpSuccessful}
                            </span>
                            {" · "}
                            Balance{" "}
                            <span className="font-mono">
                              ${userDetail.data.user.balance}
                            </span>
                          </p>
                          {userDetail.data.orders.length === 0 ? (
                            <p className="text-sm text-[var(--text-muted)]">No orders yet.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-[var(--text-muted)]">
                                    <th className="py-1 pr-2">When</th>
                                    <th className="py-1 pr-2">Service</th>
                                    <th className="py-1 pr-2">Country</th>
                                    <th className="py-1 pr-2">Status</th>
                                    <th className="py-1 pr-2">Phone</th>
                                    <th className="py-1">Price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {userDetail.data.orders.map((o) => (
                                    <tr key={o.id} className="border-t border-[var(--border)]">
                                      <td className="py-1.5 pr-2 whitespace-nowrap">
                                        {new Date(o.createdAt).toLocaleString()}
                                      </td>
                                      <td className="py-1.5 pr-2">{o.service.name}</td>
                                      <td className="py-1.5 pr-2">
                                        {o.country.flag} {o.country.code}
                                      </td>
                                      <td className="py-1.5 pr-2 font-mono">
                                        {o.status}
                                        {o.hasOtp ? " · OTP" : ""}
                                      </td>
                                      <td className="py-1.5 pr-2 font-mono">
                                        {o.phoneMasked ?? "—"}
                                      </td>
                                      <td className="py-1.5 font-mono">${o.price}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                      {userDetail.isError && (
                        <p className="text-sm text-[var(--danger)]">
                          {(userDetail.error as Error)?.message ?? "Could not load orders"}
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
