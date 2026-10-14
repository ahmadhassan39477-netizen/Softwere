"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Search,
  RefreshCw,
  XCircle,
  Check,
  ChevronLeft,
  Clock,
  ShieldCheck,
  Signal,
} from "lucide-react";
import { copyText, statusColor } from "@/lib/utils";
import { MARKETPLACE_FACTS, SERVER_POOLS } from "@/lib/catalog-content";
import Link from "next/link";

const easeOut = [0.22, 1, 0.36, 1] as const;

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

type MobileStep = "country" | "services" | "order";

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

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return desktop;
}

export function ServicesPortal() {
  const { data: session, status: authStatus, update } = useSession();
  const qc = useQueryClient();
  const isDesktop = useIsDesktop();
  const [countryQ, setCountryQ] = useState("");
  const [serviceQ, setServiceQ] = useState("");
  const [countryCode, setCountryCode] = useState<string>("US");
  const [server, setServer] = useState(1);
  const [active, setActive] = useState<ActiveOrder | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Mobile wizard: hide country list after pick so user focuses on numbers
  const [mobileStep, setMobileStep] = useState<MobileStep>("country");

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
      setMobileStep("order");
      await update();
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const cancel = useMutation({
    mutationFn: (orderId: string) => api(`/api/v1/cancel/${orderId}`, { method: "POST" }),
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
    let poll: ReturnType<typeof setInterval> | null = null;
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
      if (closed || poll) return;
      poll = setInterval(async () => {
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
            if (poll) clearInterval(poll);
            update();
          }
        } catch {
          /* ignore */
        }
      }, 2500);
    };

    return () => {
      closed = true;
      es.close();
      if (poll) clearInterval(poll);
    };
  }, [active?.id, active?.status, update]);

  const countdown = useCountdown(active?.expiresAt);
  const services = useMemo(() => servicesQuery.data?.services ?? [], [servicesQuery.data]);
  const selectedCountry =
    countriesQuery.data?.countries.find((c) => c.code === countryCode) ??
    servicesQuery.data?.country;

  async function onCopy(key: string, value: string) {
    await copyText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  function pickCountry(code: string) {
    setCountryCode(code);
    setServiceQ("");
    setMobileStep("services");
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

  const showCountries = isDesktop || mobileStep === "country";
  const showServices = isDesktop || mobileStep === "services";
  const showOrder = isDesktop || mobileStep === "order" || (mobileStep === "services" && !!active);

  const pool = SERVER_POOLS.find((p) => p.id === server) ?? SERVER_POOLS[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
      >
        <p className="eyebrow mb-2">OTP marketplace</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em]">Buy a number</h1>
        <p className="text-[var(--text-muted)] mt-1.5 text-sm max-w-2xl leading-relaxed">
          {isDesktop
            ? "Select a country, pick a service and server pool, then receive the SMS OTP in the live panel. Unused numbers refund automatically."
            : mobileStep === "country"
              ? "Step 1 — choose the country route for your verification."
              : mobileStep === "services"
                ? "Step 2 — pick the app and server pool, then buy."
                : "Step 3 — watch the inbox for your code."}
        </p>
      </motion.div>

      {/* Reference facts */}
      <motion.div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        }}
      >
        {MARKETPLACE_FACTS.map((f) => (
          <motion.div
            key={f.label}
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5"
          >
            <div className="mono-data text-[var(--accent)] text-sm">{f.value}</div>
            <div className="text-xs font-medium mt-0.5">{f.label}</div>
            <div className="text-[11px] text-[var(--text-muted)]">{f.hint}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Mobile step indicator */}
      {!isDesktop && (
        <div className="flex items-center gap-2 mono-data text-[10px] uppercase tracking-[0.16em]">
          {(
            [
              ["country", "1 · Country"],
              ["services", "2 · Number"],
              ["order", "3 · OTP"],
            ] as const
          ).map(([key, label]) => (
            <motion.span
              key={key}
              layout
              className={`rounded-full border px-2.5 py-1 ${
                mobileStep === key
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-muted)]"
              }`}
            >
              {label}
            </motion.span>
          ))}
        </div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel border-[color-mix(in_oklab,var(--danger)_50%,var(--border))] px-4 py-3 text-sm text-[#fca5a5]"
        >
          {error}
        </motion.div>
      )}

      <div className="grid gap-5 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr_320px]">
        {/* Countries — full focus on mobile until picked */}
        <AnimatePresence mode="wait">
          {showCountries && (
            <motion.section
              key="countries"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.28, ease: easeOut }}
              className="panel panel-accent p-4 flex flex-col min-h-[min(70vh,520px)] lg:min-h-[420px]"
            >
              <h2 className="font-semibold mb-3 tracking-tight">Countries</h2>
              <div className="relative mb-3">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  className="input pl-9"
                  placeholder="Search country…"
                  value={countryQ}
                  onChange={(e) => setCountryQ(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1 max-h-[60vh] lg:max-h-[520px]">
                {(countriesQuery.data?.countries ?? []).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => pickCountry(c.code)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 lg:py-2.5 text-left text-sm transition-colors ${
                      countryCode === c.code
                        ? "bg-[color-mix(in_oklab,var(--accent)_22%,transparent)]"
                        : "hover:bg-[var(--card-hover)] active:bg-[var(--card-hover)]"
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
            </motion.section>
          )}
        </AnimatePresence>

        {/* Services — mobile: alone after country pick */}
        <AnimatePresence mode="wait">
          {showServices && (
            <motion.section
              key="services"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 18 }}
              transition={{ duration: 0.3, ease: easeOut }}
              className="panel panel-accent p-4"
            >
              {selectedCountry && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--hairline)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] px-2.5 py-2">
                  {!isDesktop && (
                    <button
                      type="button"
                      className="btn btn-ghost p-1.5 shrink-0"
                      aria-label="Change country"
                      onClick={() => setMobileStep("country")}
                    >
                      <ChevronLeft size={18} />
                    </button>
                  )}
                  <span className="text-lg leading-none">{selectedCountry.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-sm">{selectedCountry.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mono-data">
                      {selectedCountry.dialCode} · {selectedCountry.code}
                    </div>
                  </div>
                  {!isDesktop && (
                    <button
                      type="button"
                      className="text-xs text-[var(--accent)] shrink-0 px-1"
                      onClick={() => setMobileStep("country")}
                    >
                      Change
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h2 className="font-semibold flex-1 tracking-tight">Services</h2>
                <div className="flex gap-1">
                  {SERVER_POOLS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServer(s.id)}
                      className={`btn text-xs px-3 py-1.5 ${server === s.id ? "btn-primary" : "btn-ghost"}`}
                      title={s.blurb}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <motion.div
                key={pool.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex gap-2 rounded-xl border border-[var(--hairline)] px-3 py-2.5 text-xs text-[var(--text-muted)]"
              >
                <Signal size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
                <p>
                  <span className="text-[var(--text)] font-medium">{pool.title} pool.</span> {pool.blurb}
                </p>
              </motion.div>

              <div className="relative mb-4">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  className="input pl-9"
                  placeholder="Search WhatsApp, Google, OpenAI…"
                  value={serviceQ}
                  onChange={(e) => setServiceQ(e.target.value)}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {services.map((svc, idx) => {
                    const offer = svc.offers.find((o) => o.server === server) ?? svc.offers[0];
                    if (!offer) return null;
                    const inStock = offer.inStock;
                    return (
                      <motion.div
                        key={svc.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: easeOut, delay: Math.min(idx, 8) * 0.03 }}
                        whileHover={{ y: -3 }}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 flex flex-col gap-3 hover:border-[var(--hairline)] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold tracking-tight">{svc.name}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5">
                              {svc.category ?? "General"}
                            </div>
                          </div>
                          <span className={`badge ${inStock ? "badge-success" : "badge-danger"}`}>
                            {inStock ? `${offer.stock} left` : "Sold out"}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <div className="text-[11px] text-[var(--text-muted)]">Price</div>
                            <div className="mono-data text-[var(--accent)] text-lg">${offer.price}</div>
                          </div>
                          <div className="text-right text-[11px] text-[var(--text-muted)]">
                            <div className="inline-flex items-center gap-1">
                              <Clock size={12} /> 20 min TTL
                            </div>
                            <div className="mt-0.5">{pool.label}</div>
                          </div>
                        </div>
                        <button
                          type="button"
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
            </motion.section>
          )}
        </AnimatePresence>

        {/* Live order */}
        <AnimatePresence mode="wait">
          {showOrder && (
            <motion.section
              key="order"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`panel panel-accent p-4 ${active?.status === "ACTIVE" ? "live-pulse" : ""}`}
            >
              {!isDesktop && mobileStep === "order" && (
                <button
                  type="button"
                  className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--accent)]"
                  onClick={() => setMobileStep("services")}
                >
                  <ChevronLeft size={16} /> Back to services
                </button>
              )}
              <h2 className="font-semibold mb-3 tracking-tight">Live order</h2>
              {!active ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3 text-sm text-[var(--text-muted)]"
                >
                  <p>Buy a number to open the OTP inbox here.</p>
                  <ul className="space-y-2">
                    {[
                      { icon: Clock, t: "20-minute wait window" },
                      { icon: ShieldCheck, t: "Auto-refund if no SMS" },
                      { icon: Copy, t: "Phone & OTP auto-copy" },
                    ].map((row, i) => (
                      <motion.li
                        key={row.t}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.08 }}
                        className="flex items-center gap-2"
                      >
                        <row.icon size={14} className="text-[var(--accent)]" />
                        {row.t}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
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
                      <code className="flex-1 panel px-3 py-2 font-mono text-sm break-all">
                        {active.phoneNumber}
                      </code>
                      <button
                        type="button"
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
                        <button
                          type="button"
                          className="btn btn-ghost px-3"
                          onClick={() => onCopy("otp", active.otpCode!)}
                        >
                          {copied === "otp" ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      )}
                    </div>
                    {active.otpMessage && (
                      <p className="mt-2 text-xs text-[var(--text-muted)]">{active.otpMessage}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-ghost flex-1" onClick={() => qc.invalidateQueries()}>
                      <RefreshCw size={14} /> Refresh
                    </button>
                    {active.status === "ACTIVE" && (
                      <button
                        type="button"
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
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
