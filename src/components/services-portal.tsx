"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1] as const;
import { Copy, Search, RefreshCw, XCircle, Check } from "lucide-react";
import { copyText, statusColor } from "@/lib/utils";
import Link from "next/link";

type Country = {
  id: string;
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  availability: number;
};

type Offer = { id: string; server: number; price: string; stock: number; inStock: boolean };
type Service = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  offers: Offer[];
};

type ActiveOrder = {
  id: string;
  phoneNumber: string | null;
  status: string;
  price: string;
  server: number;
  expiresAt: string;
  country: { code: string; name: string; flag: string };
  service: { slug: string; name: string };
  otpCode?: string | null;
  otpMessage?: string | null;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

function useCountdown(expiresAt?: string) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [expiresAt]);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return { left, label: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` };
}

export function ServicesPortal() {
  const { data: session, status: authStatus, update } = useSession();
  const qc = useQueryClient();
  const [countryQ, setCountryQ] = useState("");
  const [serviceQ, setServiceQ] = useState("");
  const [countryCode, setCountryCode] = useState<string>("US");
  const [server, setServer] = useState(1);
  const [active, setActive] = useState<ActiveOrder | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");

  const countriesQuery = useQuery({
    queryKey: ["countries", countryQ],
    enabled: authStatus === "authenticated",
    queryFn: () =>
      api<{ countries: Country[] }>(`/api/v1/countries?q=${encodeURIComponent(countryQ)}`),
  });

  const servicesQuery = useQuery({
    queryKey: ["services", countryCode, serviceQ],
    enabled: authStatus === "authenticated" && Boolean(countryCode),
    queryFn: () =>
      api<{ services: Service[]; country: Country }>(
        `/api/v1/services?country=${countryCode}&q=${encodeURIComponent(serviceQ)}`,
      ),
  });

  const purchase = useMutation({
    mutationFn: (payload: { countryCode: string; serviceSlug: string; server: number }) =>
      api<{ order: ActiveOrder }>("/api/v1/purchase", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async (data) => {
      setError("");
      setActive({ ...data.order, otpCode: null });
      await update();
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const cancel = useMutation({
    mutationFn: (orderId: string) =>
      api(`/api/v1/cancel/${orderId}`, { method: "POST" }),
    onSuccess: async () => {
      setActive((o) => (o ? { ...o, status: "REFUNDED" } : o));
      await update();
    },
    onError: (e: Error) => setError(e.message),
  });

  // SSE with polling fallback
  useEffect(() => {
    if (!active?.id || ["RECEIVED", "REFUNDED", "CANCELLED", "EXPIRED"].includes(active.status)) {
      return;
    }

    let closed = false;
    const es = new EventSource(`/api/stream/otp/${active.id}`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "otp" || data.type === "wait") {
          setActive((prev) =>
            prev
              ? {
                  ...prev,
                  status: data.status ?? prev.status,
                  otpCode: data.code ?? prev.otpCode,
                  otpMessage: data.message ?? prev.otpMessage,
                }
              : prev,
          );
          if (data.code) {
            copyText(data.code);
            setCopied("otp");
            update();
          }
          if (["RECEIVED", "REFUNDED", "EXPIRED", "CANCELLED"].includes(data.status)) {
            es.close();
          }
        }
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      es.close();
      if (closed) return;
      const poll = setInterval(async () => {
        try {
          const data = await api<{
            status: string;
            code: string | null;
            message: string | null;
          }>(`/api/v1/otp/${active.id}`);
          setActive((prev) =>
            prev
              ? { ...prev, status: data.status, otpCode: data.code, otpMessage: data.message }
              : prev,
          );
          if (data.code) {
            copyText(data.code);
            setCopied("otp");
          }
          if (["RECEIVED", "REFUNDED", "EXPIRED", "CANCELLED"].includes(data.status)) {
            clearInterval(poll);
            update();
          }
        } catch {
          /* ignore */
        }
      }, 2500);
      return () => clearInterval(poll);
    };

    return () => {
      closed = true;
      es.close();
    };
  }, [active?.id, active?.status, update]);

  const countdown = useCountdown(active?.expiresAt);

  const services = useMemo(() => servicesQuery.data?.services ?? [], [servicesQuery.data]);

  function onCopy(label: string, value: string) {
    copyText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="panel p-8 text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold">Buy OTP numbers</h1>
        <p className="mt-2 text-[var(--text-muted)]">Sign in to browse countries and services.</p>
        <Link href="/login" className="btn btn-primary mt-6 inline-flex">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
      >
        <p className="eyebrow mb-2">Marketplace</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em]">Services</h1>
        <p className="text-[var(--text-muted)] mt-1.5 text-sm max-w-xl">
          Choose a country and service — matching the easyotps-style purchase flow.
        </p>
      </motion.div>

      {error && (
        <div className="panel border-[color-mix(in_oklab,var(--danger)_50%,var(--border))] px-4 py-3 text-sm text-[#fca5a5]">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr_320px]">
        {/* Countries */}
        <section className="panel panel-accent p-4 flex flex-col min-h-[420px]">
          <h2 className="font-semibold mb-3 tracking-tight">Countries</h2>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              className="input pl-9"
              placeholder="Search country…"
              value={countryQ}
              onChange={(e) => setCountryQ(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1 max-h-[520px]">
            {(countriesQuery.data?.countries ?? []).map((c) => (
              <button
                key={c.code}
                onClick={() => setCountryCode(c.code)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  countryCode === c.code
                    ? "bg-[color-mix(in_oklab,var(--accent)_22%,transparent)]"
                    : "hover:bg-[var(--card-hover)]"
                }`}
              >
                <span className="text-lg">{c.flag}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {c.dialCode} · {c.availability} avail
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Services */}
        <section className="panel panel-accent p-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="font-semibold flex-1 tracking-tight">Services</h2>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => setServer(s)}
                  className={`btn text-xs px-3 py-1.5 ${server === s ? "btn-primary" : "btn-ghost"}`}
                >
                  Server {s}
                </button>
              ))}
            </div>
          </div>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              className="input pl-9"
              placeholder="Search WhatsApp, Google, OpenAI…"
              value={serviceQ}
              onChange={(e) => setServiceQ(e.target.value)}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {services.map((svc) => {
                const offer = svc.offers.find((o) => o.server === server) ?? svc.offers[0];
                if (!offer) return null;
                const inStock = offer.inStock;
                return (
                  <motion.div
                    key={svc.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.35, ease: easeOut }}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 flex flex-col gap-3 hover:border-[var(--hairline)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{svc.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{svc.category}</div>
                      </div>
                      <span className={`badge ${inStock ? "badge-success" : "badge-danger"}`}>
                        {inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="mono-data text-[var(--accent)]">${offer.price}</div>
                      <div className="text-xs text-[var(--text-muted)]">Srv {offer.server}</div>
                    </div>
                    <button
                      className="btn btn-primary w-full"
                      disabled={!inStock || purchase.isPending || !session}
                      onClick={() =>
                        purchase.mutate({
                          countryCode,
                          serviceSlug: svc.slug,
                          server: offer.server,
                        })
                      }
                    >
                      {purchase.isPending ? "Buying…" : "Buy number"}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>

        {/* Live order panel */}
        <section className={`panel panel-accent p-4 ${active?.status === "ACTIVE" ? "live-pulse" : ""}`}>
          <h2 className="font-semibold mb-3 tracking-tight">Live order</h2>
          {!active ? (
            <p className="text-sm text-[var(--text-muted)]">
              Purchase a number to open the OTP inbox with countdown and auto-copy.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`badge ${statusColor(active.status)}`}>{active.status}</span>
                <span className="font-mono text-lg">{countdown.label}</span>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">Service</div>
                <div className="font-medium">
                  {active.country.flag} {active.service.name} · Srv {active.server}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">Phone number</div>
                <div className="flex gap-2">
                  <code className="flex-1 panel px-3 py-2 font-mono text-sm">{active.phoneNumber}</code>
                  <button
                    className="btn btn-ghost px-3"
                    onClick={() => onCopy("phone", active.phoneNumber ?? "")}
                  >
                    {copied === "phone" ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">OTP code</div>
                <div className="flex gap-2">
                  <code className="flex-1 panel px-3 py-2 font-mono text-sm min-h-[42px]">
                    {active.otpCode ?? (active.status === "ACTIVE" ? "Waiting for SMS…" : "—")}
                  </code>
                  {active.otpCode && (
                    <button className="btn btn-ghost px-3" onClick={() => onCopy("otp", active.otpCode!)}>
                      {copied === "otp" ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  )}
                </div>
                {active.otpMessage && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{active.otpMessage}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost flex-1"
                  onClick={() => qc.invalidateQueries()}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
                {active.status === "ACTIVE" && (
                  <button
                    className="btn btn-danger flex-1"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(active.id)}
                  >
                    <XCircle size={14} /> Cancel
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Manual cancel/refund within 2 minutes if no OTP. Auto-refund on expiry.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
