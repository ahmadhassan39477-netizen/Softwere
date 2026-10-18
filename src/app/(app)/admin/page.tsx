"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
  { value: "sms-man", label: "SMS-Man", defaultMarkup: 20 },
  { value: "custom-sa", label: "Custom (SMS-Activate API)", defaultMarkup: 20 },
];

function mergeProviderTypes(fromApi?: ProviderTypeOption[]): ProviderTypeOption[] {
  const byValue = new Map<string, ProviderTypeOption>();
  for (const t of ADMIN_PROVIDER_TYPES) byValue.set(t.value, t);
  for (const t of fromApi ?? []) {
    if (!byValue.has(t.value)) byValue.set(t.value, t);
  }
  // Keep SMS-Man immediately after Grizzly in the dropdown
  const order = ["sms-activate", "5sim", "grizzlysms", "sms-man", "custom-sa"];
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
  const [vpnKey, setVpnKey] = useState("");
  const [vpnSecret, setVpnSecret] = useState("");
  const [vpnEnabled, setVpnEnabled] = useState(true);
  const [vpnMarkup, setVpnMarkup] = useState("20");
  const [vpnDisplay, setVpnDisplay] = useState("VPN & Proxy");
  const [vpnBase, setVpnBase] = useState("https://api.proxy-cheap.com");

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
      return res.json();
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
      return data;
    },
    onSuccess: () => {
      setMsg("Saved.");
      setKeyDrafts({});
      qc.invalidateQueries({ queryKey: ["admin-provider-settings"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

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
          note: creditNote.trim() || "WhatsApp payment confirmed",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Credit failed");
      return data;
    },
    onSuccess: (data) => {
      setMsg(`Credited $${data.credited} to ${data.user.email}. New balance $${data.user.balance}`);
      setCreditNote("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
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
        <h2 className="font-semibold">Top up wallet (after WhatsApp payment)</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Only credit after you confirm the customer paid you. No automatic fake money.
        </p>
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
              {(users.data?.users ?? []).map((u: { email: string }) => (
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
            placeholder="WhatsApp payment confirmed"
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={credit.isPending || !creditEmail.trim() || Number(creditAmount) <= 0}
          onClick={() => credit.mutate()}
        >
          {credit.isPending ? "Crediting…" : "Credit wallet"}
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
        <h2 className="font-semibold mb-1">SMS providers — Server 1 / 2 / 3</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Each server is a slot: pick provider type, paste API key, set margin %. Default margin
          is {settings.data?.grizzlyDefaultMarkup ?? 20}% for all servers (retail = wholesale ×
          1.20). Defaults: Server 1 = 5SIM, Server 2 = Grizzly, Server 3 = SMS-Man.
          SMS-Man: log in at sms-man.com → open Profile / Account → copy only the API token
          string. Never paste the docs “Get sms” example URL
          (…/get-sms?token=$token&amp;request_id=…) — Admin rejects that. Customer /services
          never shows wholesale brand names. Keys stay in Admin — never shared in chat.
        </p>
        <div className="space-y-4">
          {providers.map((p) => {
            const types = mergeProviderTypes(settings.data?.providerTypes);
            const type = p.providerType ?? "sms-activate";
            const keyPlaceholder =
              type === "sms-man"
                ? "Paste SMS-Man profile token (not a get-sms URL)"
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
                      {p.envConfigured ? " · env fallback" : ""} · balance{" "}
                      {p.balance != null ? `$${p.balance}` : "—"}
                      {p.live === true
                        ? ` · live prices OK (${p.livePriceRows ?? 0} rows)`
                        : p.live === false
                          ? " · live prices missing"
                          : ""}
                      {p.enabled && p.hasApiKey
                        ? " · buy ready"
                        : p.enabled && !p.hasApiKey
                          ? " · buy blocked (no key)"
                          : " · buy off"}
                    </div>
                    {p.enabled && !p.hasApiKey ? (
                      <div className="text-xs text-amber-400 mt-1">
                        Enabled but no API key on this server slot — paste the key once and
                        click Save key (Enable alone does not store a key). Legacy keys are
                        copied automatically when found.
                      </div>
                    ) : null}
                    {p.tokenLooksLikeDocsUrl ? (
                      <div className="text-xs text-amber-400 mt-1">
                        Saved value looks like a docs URL — clear it and paste the profile
                        token only, then Save key.
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
                    onClick={() => patch.mutate({ key: p.key, enabled: !p.enabled })}
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

                <div className="flex flex-wrap gap-2">
                  <input
                    className="input flex-1 min-w-[200px] font-mono text-sm"
                    type="password"
                    autoComplete="off"
                    placeholder={keyPlaceholder}
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
                </div>
              </div>
            );
          })}
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
              <th className="p-3"></th>
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
                  <td className="p-3">
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      onClick={() => setCreditEmail(u.email)}
                    >
                      Top up
                    </button>
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
