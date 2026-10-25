"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  RefreshCw,
  XCircle,
  Check,
  ChevronLeft,
  Clock,
  ShieldCheck,
  Signal,
  Wallet,
} from "lucide-react";
import { copyText, statusColor } from "@/lib/utils";
import { MARKETPLACE_FACTS, SERVER_POOLS } from "@/lib/catalog-content";
import { cn } from "@/lib/utils";
import { sanitizeCustomerBuyError } from "@/lib/sms/customer-errors";
import { ServiceLogo } from "@/components/service-logo";
import { CatalogSearch } from "@/components/catalog-search";
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
  serverMode?: string;
  expiresAt: string;
  country: { code: string; name: string; flag: string };
  service: { slug: string; name: string };
  otpCode?: string | null;
  otpMessage?: string | null;
  providerKey?: string;
};

type HistoryOrder = {
  id: string;
  status: string;
  phoneNumber: string | null;
  otpCode: string | null;
  otpMessage?: string | null;
  price: string;
  server: number;
  serverMode?: string;
  expiresAt: string;
  createdAt: string;
  country: { code: string; name: string; flag: string };
  service: { slug: string; name: string };
};

type MobileStep = "country" | "services" | "order";

const LIVE_PANEL_STATUSES = new Set(["ACTIVE", "PENDING", "WAITING", "RECEIVED"]);

function toActiveOrder(o: HistoryOrder | ActiveOrder): ActiveOrder {
  return {
    id: o.id,
    phoneNumber: o.phoneNumber,
    status: o.status,
    price: o.price,
    server: o.server,
    serverMode: o.serverMode,
    expiresAt: typeof o.expiresAt === "string" ? o.expiresAt : String(o.expiresAt),
    country: o.country,
    service: o.service,
    otpCode: o.otpCode ?? null,
    otpMessage: "otpMessage" in o ? (o.otpMessage ?? null) : null,
  };
}

function serverLabel(order: ActiveOrder): string {
  if (order.serverMode === "auto") return "Auto";
  if (order.server === 1) return "Primary";
  if (order.server === 2) return "Backup";
  return "Extra";
}

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

/** Full SMS with OTP digits highlighted — keep entire message readable. */
function OtpSmsBody({ message, code }: { message: string; code?: string | null }) {
  const text = message.trim();
  if (!text) return null;
  const otp = code?.trim();
  if (!otp || !text.includes(otp)) {
    return <p className="mt-2 text-sm text-[var(--text)] leading-relaxed break-words">{text}</p>;
  }
  const parts = text.split(otp);
  return (
    <p className="mt-2 text-sm text-[var(--text)] leading-relaxed break-words">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? (
            <mark className="mx-0.5 rounded px-1.5 py-0.5 font-mono text-base font-bold tracking-[0.12em] bg-[color-mix(in_oklab,var(--accent)_28%,transparent)] text-[var(--accent)]">
              {otp}
            </mark>
          ) : null}
        </span>
      ))}
    </p>
  );
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

function LiveOrderPanel({
  order,
  panelRef,
  copied,
  onCopy,
  refreshPending,
  cancelPending,
  onRefresh,
  onCancel,
}: {
  order: ActiveOrder;
  panelRef?: RefObject<HTMLDivElement | null>;
  copied: string | null;
  onCopy: (key: string, value: string) => void;
  refreshPending: boolean;
  cancelPending: boolean;
  onRefresh: () => void;
  onCancel: () => void;
}) {
  const countdown = useCountdown(order.expiresAt);
  const waiting = ["ACTIVE", "PENDING", "WAITING"].includes(order.status) && !order.otpCode;
  const hasCode = Boolean(order.otpCode) || order.status === "RECEIVED";

  return (
    <motion.section
      ref={panelRef}
      tabIndex={-1}
      id={`live-order-${order.id}`}
      initial={{ opacity: 0, y: -28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`panel panel-accent relative overflow-hidden p-4 sm:p-5 ring-2 ring-[var(--accent)] outline-none ${
        waiting ? "live-pulse" : ""
      }`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,color-mix(in_oklab,var(--accent)_28%,transparent),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.45] }}
        transition={{ duration: 1.1 }}
      />
      <div className="relative z-[1] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="eyebrow mb-1">Live order · stays until Cancel</p>
            <h2 className="text-lg font-semibold tracking-tight">
              {order.country.flag} {order.service.name}
              <span className="text-[var(--text-muted)] font-normal text-sm">
                {" "}
                · {serverLabel(order)}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${statusColor(order.status)}`}>{order.status}</span>
            {waiting && (
              <span className="font-mono text-xl tabular-nums">{countdown.label}</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)] mb-1">Phone number</div>
          <div className="flex gap-2">
            <code className="flex-1 panel px-3 py-2.5 font-mono text-sm break-all">
              {order.phoneNumber}
            </code>
            <button
              type="button"
              className="btn btn-ghost px-3"
              onClick={() => onCopy(`phone-${order.id}`, order.phoneNumber ?? "")}
              aria-label="Copy phone"
            >
              {copied === `phone-${order.id}` ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)] mb-1">OTP code</div>
          <div className="flex gap-2">
            <code
              className={`flex-1 panel px-3 py-3 font-mono text-2xl sm:text-3xl tracking-[0.18em] min-h-[56px] flex items-center ${
                order.otpCode ? "text-[var(--accent)] font-bold" : "text-[var(--text-muted)] text-lg tracking-normal font-medium"
              }`}
            >
              {order.otpCode ?? (waiting ? "Waiting for SMS…" : "—")}
            </code>
            {order.otpCode && (
              <button
                type="button"
                className="btn btn-ghost px-3"
                onClick={() => onCopy(`otp-${order.id}`, order.otpCode!)}
                aria-label="Copy OTP"
              >
                {copied === `otp-${order.id}` ? <Check size={16} /> : <Copy size={16} />}
              </button>
            )}
          </div>
          {order.otpMessage ? (
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] mb-1">
                Full SMS
              </div>
              <OtpSmsBody message={order.otpMessage} code={order.otpCode} />
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost flex-1 min-w-[8rem]"
            disabled={refreshPending || hasCode}
            onClick={onRefresh}
          >
            <RefreshCw size={14} className={refreshPending ? "animate-spin" : ""} />{" "}
            {refreshPending ? "Checking…" : "Refresh"}
          </button>
          <button
            type="button"
            className="btn btn-danger flex-1 min-w-[8rem]"
            disabled={cancelPending}
            onClick={onCancel}
          >
            <XCircle size={14} /> {hasCode ? "Done · dismiss" : "Cancel · refund"}
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {hasCode
            ? "OTP received — this card stays here until you dismiss. Account history keeps the order."
            : "This card stays on Services if you leave and come back. You have at least 20 minutes (or the provider wait if longer). Cancel anytime unused for a refund; auto-refund if no SMS when the timer ends."}
        </p>
      </div>
    </motion.section>
  );
}

export function ServicesPortal() {
  const { data: session, status: authStatus, update } = useSession();
  const qc = useQueryClient();
  const isDesktop = useIsDesktop();
  const [countryQ, setCountryQ] = useState("");
  const [serviceQ, setServiceQ] = useState("");
  const [countryCode, setCountryCode] = useState<string>("US");
  const [server, setServer] = useState<1 | 2 | 3 | "auto">("auto");
  /** All live / OTP-received orders pinned on /services until Cancel */
  const [liveOrders, setLiveOrders] = useState<ActiveOrder[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  /** In-flight Buy lock — prevents double-submit / multi-button flash */
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const activeOrderRef = useRef<HTMLDivElement | null>(null);
  /** One smooth scroll per order on Buy — never on poll/refetch/catalog picks */
  const scrolledBuyIdsRef = useRef<Set<string>>(new Set());
  /** One smooth scroll per order when OTP first arrives */
  const scrolledOtpIdsRef = useRef<Set<string>>(new Set());
  // Mobile wizard: hide country list after pick so user focuses on numbers
  const [mobileStep, setMobileStep] = useState<MobileStep>("country");
  const active = liveOrders[0] ?? null;
  const waitingLive = liveOrders.some((o) =>
    ["ACTIVE", "PENDING", "WAITING"].includes(o.status) && !o.otpCode,
  );

  /** Single smooth scroll to a live card — no scrollTo(0), no multi-tick thrash */
  function smoothScrollToLiveOrder(orderId: string, block: ScrollLogicalPosition = "start") {
    if (typeof window === "undefined") return;
    const run = () => {
      const el =
        document.getElementById(`live-order-${orderId}`) ??
        (activeOrderRef.current?.id === `live-order-${orderId}`
          ? activeOrderRef.current
          : null);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block });
      if (el instanceof HTMLElement) el.focus({ preventScroll: true });
    };
    // One paint frame so the card exists; do not schedule repeat scrolls
    window.requestAnimationFrame(run);
  }

  // Full world list once — search is local (never refetch 224 countries per keystroke)
  const countriesQuery = useQuery({
    queryKey: ["countries"],
    enabled: authStatus === "authenticated",
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: () => api<{ countries: Country[]; total?: number }>("/api/v1/countries"),
  });

  // Always load live=1 stock overlay (Primary/Backup/Extra). live=0 seed must not
  // overwrite live rows on focus/refetch — that looked like "Server 1 has no stock".
  const servicesQuery = useQuery({
    queryKey: ["services", countryCode],
    enabled: authStatus === "authenticated" && Boolean(countryCode),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    queryFn: () =>
      api<{
        services: Service[];
        country: Country;
        liveStock?: boolean;
        slotStatuses?: Record<
          string,
          { status: string; liveRows: number; message: string }
        >;
      }>(`/api/v1/services?country=${encodeURIComponent(countryCode)}&live=1`),
  });

  // Prefetch popular countries with the same live overlay
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const prefetch = (code: string) => {
      void qc.prefetchQuery({
        queryKey: ["services", code],
        staleTime: 60_000,
        queryFn: () =>
          api<{ services: Service[]; country: Country; liveStock?: boolean }>(
            `/api/v1/services?country=${encodeURIComponent(code)}&live=1`,
          ),
      });
    };
    prefetch("US");
    prefetch("GB");
    prefetch("NG");
  }, [authStatus, qc]);

  const historyQuery = useQuery({
    queryKey: ["orders-history"],
    enabled: authStatus === "authenticated",
    queryFn: () =>
      api<{ orders: HistoryOrder[]; livePanel?: HistoryOrder[] }>("/api/orders"),
    // Keep syncing while any panel order is waiting for SMS
    refetchInterval: waitingLive ? 5_000 : 20_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Restore every live / OTP-received order on load, tab focus, and after leave/return
  useEffect(() => {
    if (authStatus !== "authenticated") {
      setLiveOrders([]);
      return;
    }
    const panel = historyQuery.data?.livePanel;
    const fallback = (historyQuery.data?.orders ?? []).filter((o) =>
      LIVE_PANEL_STATUSES.has(o.status),
    );
    const source = panel ?? fallback;
    if (!historyQuery.data) return;

    setLiveOrders((prev) => {
      const byId = new Map(prev.map((o) => [o.id, o]));
      const next = source.map((o) => {
        const mapped = toActiveOrder(o);
        const existing = byId.get(o.id);
        // Prefer fresher OTP from SSE/local if history lagging
        if (existing?.otpCode && !mapped.otpCode) {
          return { ...mapped, otpCode: existing.otpCode, otpMessage: existing.otpMessage, status: existing.status === "RECEIVED" ? "RECEIVED" : mapped.status };
        }
        return mapped;
      });
      // Drop refunded / cancelled that server no longer lists as live
      return next;
    });
  }, [authStatus, historyQuery.data]);

  // Visibility / bfcache: when she returns to the tab or www, re-pull panel
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ["orders-history"] });
      void qc.invalidateQueries({ queryKey: ["orders"] });
    };
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [authStatus, qc]);

  const purchase = useMutation({
    mutationFn: (payload: {
      countryCode: string;
      serviceSlug: string;
      server: 1 | 2 | 3 | "auto";
      _buyKey: string;
    }) =>
      api<{ order: ActiveOrder }>("/api/orders/buy", {
        method: "POST",
        body: JSON.stringify({
          countryCode: payload.countryCode,
          serviceSlug: payload.serviceSlug,
          server: payload.server,
        }),
      }),
    onMutate: (payload) => {
      setError("");
      setBuyingKey(payload._buyKey);
    },
    onSuccess: async (data) => {
      setError("");
      const order = { ...data.order, otpCode: data.order.otpCode ?? null };
      setLiveOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      // Keep catalog on the "services" step so countries/services do not unmount
      setMobileStep("services");
      // Soft wallet refresh — do not touch services query (avoids catalog remount flash)
      await update();
      qc.invalidateQueries({ queryKey: ["orders-history"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      // Buy success → one smooth scroll only (never on later poll/history sync)
      if (!scrolledBuyIdsRef.current.has(order.id)) {
        scrolledBuyIdsRef.current.add(order.id);
        smoothScrollToLiveOrder(order.id, "start");
      }
    },
    onError: (e: Error) => setError(sanitizeCustomerBuyError(e.message)),
    onSettled: () => {
      setBuyingKey(null);
    },
  });

  const cancel = useMutation({
    mutationFn: (orderId: string) =>
      api(`/api/orders/cancel`, {
        method: "POST",
        body: JSON.stringify({ orderId }),
      }),
    onSuccess: async (_data, orderId) => {
      setLiveOrders((prev) => prev.filter((o) => o.id !== orderId));
      scrolledBuyIdsRef.current.delete(orderId);
      scrolledOtpIdsRef.current.delete(orderId);
      await update();
      qc.invalidateQueries({ queryKey: ["orders-history"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => setError(sanitizeCustomerBuyError(e.message)),
  });

  const refreshOtp = useMutation({
    mutationFn: (orderId: string) =>
      api<{ status: string; code: string | null; message: string | null }>(
        `/api/v1/otp/${orderId}`,
      ).then((data) => ({ orderId, ...data })),
    onSuccess: (data) => {
      let firstOtp = false;
      setLiveOrders((prev) => {
        const before = prev.find((o) => o.id === data.orderId);
        if (data.code && !before?.otpCode) firstOtp = true;
        const next = prev.map((o) =>
          o.id === data.orderId
            ? {
                ...o,
                status: data.status ?? o.status,
                otpCode: data.code ?? o.otpCode,
                otpMessage: data.message ?? o.otpMessage,
              }
            : o,
        );
        // Auto-refund removed it from live set after refetch; drop terminal statuses
        return next.filter((o) => LIVE_PANEL_STATUSES.has(o.status));
      });
      if (data.code) {
        copyText(data.code);
        setCopied("otp");
      }
      if (firstOtp && data.code && !scrolledOtpIdsRef.current.has(data.orderId)) {
        scrolledOtpIdsRef.current.add(data.orderId);
        smoothScrollToLiveOrder(data.orderId, "nearest");
      }
      if (["REFUNDED", "CANCELLED", "EXPIRED"].includes(data.status)) {
        setLiveOrders((prev) => prev.filter((o) => o.id !== data.orderId));
      }
      qc.invalidateQueries({ queryKey: ["orders-history"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      update();
    },
    onError: (e: Error) => setError(sanitizeCustomerBuyError(e.message)),
  });

  // SSE for every waiting live order (OTP stays on card when RECEIVED)
  useEffect(() => {
    const waiting = liveOrders.filter(
      (o) => ["ACTIVE", "PENDING", "WAITING"].includes(o.status) && !o.otpCode,
    );
    if (waiting.length === 0) return;

    const controllers: Array<{ close: () => void }> = [];

    for (const order of waiting) {
      let closed = false;
      let poll: ReturnType<typeof setInterval> | null = null;
      const es = new EventSource(`/api/orders/stream?orderId=${encodeURIComponent(order.id)}`);

      const applyUpdate = (data: {
        status?: string;
        code?: string | null;
        message?: string | null;
      }) => {
        let firstOtp = false;
        setLiveOrders((prev) => {
          const before = prev.find((o) => o.id === order.id);
          if (data.code && !before?.otpCode) firstOtp = true;
          const mapped = prev.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  status: data.status ?? o.status,
                  otpCode: data.code ?? o.otpCode,
                  otpMessage: data.message ?? o.otpMessage,
                }
              : o,
          );
          return mapped.filter((o) => {
            if (["REFUNDED", "CANCELLED", "EXPIRED"].includes(o.status)) return false;
            return LIVE_PANEL_STATUSES.has(o.status);
          });
        });
        if (data.code) {
          copyText(data.code);
          setCopied("otp");
          update();
          qc.invalidateQueries({ queryKey: ["orders-history"] });
        }
        // First SMS only — do not re-scroll on later SSE/poll ticks
        if (firstOtp && data.code && !scrolledOtpIdsRef.current.has(order.id)) {
          scrolledOtpIdsRef.current.add(order.id);
          smoothScrollToLiveOrder(order.id, "nearest");
        }
      };

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "otp" || data.type === "wait") {
            applyUpdate(data);
            if (["REFUNDED", "EXPIRED", "CANCELLED"].includes(data.status)) {
              es.close();
            }
            // RECEIVED: keep card, stop this stream
            if (data.status === "RECEIVED" || data.code) es.close();
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
            }>(`/api/v1/otp/${order.id}`);
            applyUpdate(data);
            if (["RECEIVED", "REFUNDED", "EXPIRED", "CANCELLED"].includes(data.status) || data.code) {
              if (poll) clearInterval(poll);
            }
          } catch {
            /* ignore */
          }
        }, 3000);
      };

      controllers.push({
        close: () => {
          closed = true;
          es.close();
          if (poll) clearInterval(poll);
        },
      });
    }

    return () => {
      for (const c of controllers) c.close();
    };
  }, [liveOrders.map((o) => `${o.id}:${o.status}:${o.otpCode ?? ""}`).join("|"), update, qc]);

  const allCountries = useMemo(
    () => countriesQuery.data?.countries ?? [],
    [countriesQuery.data?.countries],
  );
  const filteredCountries = useMemo(() => {
    const needle = countryQ.trim().toLowerCase();
    if (!needle) return allCountries;
    return allCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.code.toLowerCase().includes(needle) ||
        c.dialCode.includes(needle),
    );
  }, [allCountries, countryQ]);

  const allServices = useMemo(
    () => servicesQuery.data?.services ?? [],
    [servicesQuery.data?.services],
  );
  const services = useMemo(() => {
    const needle = serviceQ.trim().toLowerCase();
    if (!needle) return allServices;
    return allServices.filter(
      (s) => s.name.toLowerCase().includes(needle) || s.slug.toLowerCase().includes(needle),
    );
  }, [allServices, serviceQ]);

  const selectedCountry =
    allCountries.find((c) => c.code === countryCode) ?? servicesQuery.data?.country;

  const balance = Number(session?.user?.balance ?? 0);
  /** Empty wallet only — never gate on catalog min / hardcoded ~$0.30–$0.35 floor. */
  const walletEmpty = !Number.isFinite(balance) || balance < 0.01;
  const buyInFlight = buyingKey != null || purchase.isPending;

  const servicesLoading =
    servicesQuery.isLoading || (servicesQuery.isFetching && allServices.length === 0);
  const servicesRefreshing =
    servicesQuery.isFetching && allServices.length > 0 && Boolean(servicesQuery.isPlaceholderData);

  async function onCopy(key: string, value: string) {
    await copyText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  function prefetchCountry(code: string) {
    void qc.prefetchQuery({
      queryKey: ["services", code],
      staleTime: 60_000,
      queryFn: () =>
        api<{ services: Service[]; country: Country; liveStock?: boolean }>(
          `/api/v1/services?country=${encodeURIComponent(code)}&live=1`,
        ),
    });
  }

  function pickCountry(code: string) {
    prefetchCountry(code);
    setCountryCode(code);
    setServiceQ("");
    setMobileStep("services");
    // If a live OTP card is already on screen, do not yank to top — user may be
    // picking country/server/service for a second purchase further down the catalog.
    if (
      typeof window !== "undefined" &&
      window.innerWidth < 1024 &&
      liveOrders.length === 0
    ) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /** Gate: wallet >= exact retail of the selected offer (same figure shown as Price). */
  function canAfford(price: string) {
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) return false;
    return balance + 1e-9 >= p;
  }

  function shortfallLabel(price: string) {
    const p = Number(price);
    const need = Number.isFinite(p) ? p.toFixed(4) : price;
    const have = Number.isFinite(balance) ? balance.toFixed(4) : "0.0000";
    return `Need $${need} · wallet $${have}`;
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="panel p-8 text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold">Buy OTP numbers</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Create an account or sign in first — then you can buy numbers and receive OTP codes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/register?callbackUrl=/services" className="btn btn-primary inline-flex">
            Create account
          </Link>
          <Link href="/login?callbackUrl=/services" className="btn btn-ghost inline-flex">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // Keep services catalog mounted with a live card; do not force-remount countries
  // on mobile (that layout thrash yanked scroll while choosing a second number).
  const hasLivePanel = liveOrders.length > 0;
  const showCountries = isDesktop || mobileStep === "country";
  const showServices =
    isDesktop || mobileStep === "services" || mobileStep === "order" || hasLivePanel;
  const showOrder = isDesktop || mobileStep === "order" || (mobileStep === "services" && !!active);

  const pool = SERVER_POOLS.find((p) => p.id === server) ?? SERVER_POOLS[0];
  const history = historyQuery.data?.orders ?? [];

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

      {walletEmpty && authStatus === "authenticated" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
          className="low-balance-banner px-4 py-4"
          role="status"
        >
          <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--danger)_22%,transparent)] text-[var(--danger)]">
                <Wallet size={20} />
              </span>
              <div>
                <p className="text-base font-semibold tracking-tight">
                  Wallet is empty — deposit to buy
                </p>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  Current balance{" "}
                  <span className="mono-data font-semibold text-[var(--danger)]">
                    ${Number.isFinite(balance) ? balance.toFixed(4) : "0.0000"}
                  </span>
                  . Message us on WhatsApp from Deposit after you sign in.
                </p>
              </div>
            </div>
            <Link
              href="/deposit"
              className="btn btn-primary relative z-[1] inline-flex min-h-12 shrink-0 items-center justify-center gap-2 px-5"
            >
              <Wallet size={16} />
              Message us on WhatsApp
            </Link>
          </div>
        </motion.div>
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

      {/* Live orders stay on /services until Cancel — survive reload / leave / return */}
      <AnimatePresence>
        {liveOrders.map((order, idx) => (
          <LiveOrderPanel
            key={`live-${order.id}`}
            order={order}
            panelRef={idx === 0 ? activeOrderRef : undefined}
            copied={copied}
            onCopy={onCopy}
            refreshPending={refreshOtp.isPending}
            cancelPending={cancel.isPending}
            onRefresh={() => refreshOtp.mutate(order.id)}
            onCancel={() => cancel.mutate(order.id)}
          />
        ))}
      </AnimatePresence>

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
              className="panel panel-accent p-4 flex flex-col lg:min-h-[420px]"
            >
              <h2 className="font-semibold mb-1 tracking-tight text-lg lg:text-base">
                Select country
              </h2>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                {allCountries.length > 0
                  ? `${filteredCountries.length} of ${allCountries.length} countries`
                  : "Loading world list…"}
                {" — "}instant local search.
              </p>
              <CatalogSearch
                className="mb-3"
                label="Find a country"
                placeholder="Search country name or dial code…"
                value={countryQ}
                onChange={setCountryQ}
              />

              {/* Mobile: thumb-friendly 2-col cards — scroll full world list */}
              <div className="grid grid-cols-2 gap-2.5 lg:hidden max-h-[min(70vh,640px)] overflow-y-auto scrollbar-thin pr-0.5">
                {countriesQuery.isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="svc-skeleton min-h-[7.5rem]" />
                  ))}
                {countriesQuery.isError && (
                  <p className="col-span-2 text-sm text-[#fda4af] py-4 text-center">
                    Couldn’t load countries. Refresh the page.
                  </p>
                )}
                {filteredCountries.map((c) => {
                  const selected = countryCode === c.code;
                  return (
                    <motion.button
                      key={c.code}
                      type="button"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      onMouseEnter={() => prefetchCountry(c.code)}
                      onFocus={() => prefetchCountry(c.code)}
                      onClick={() => pickCountry(c.code)}
                      className={cn(
                        "min-h-[7.5rem] flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-4 text-center transition-colors",
                        "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                        selected
                          ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_18%,transparent)]"
                          : "border-[var(--border)] bg-[var(--bg-elevated)] active:bg-[var(--card-hover)]",
                      )}
                    >
                      <span className="text-3xl leading-none" aria-hidden>
                        {c.flag}
                      </span>
                      <span className="font-semibold text-sm leading-tight">{c.name}</span>
                      <span className="mono-data text-[10px] text-[var(--text-muted)]">
                        {c.dialCode} · {c.availability}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Desktop: compact list */}
              <div className="hidden lg:block flex-1 overflow-y-auto scrollbar-thin space-y-1 max-h-[520px]">
                {countriesQuery.isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="svc-skeleton h-12 mb-1" />
                  ))}
                {countriesQuery.isError && (
                  <p className="px-3 py-4 text-sm text-[#fda4af]">
                    Couldn’t load countries. Refresh the page.
                  </p>
                )}
                {!countriesQuery.isLoading &&
                  !countriesQuery.isError &&
                  filteredCountries.length === 0 && (
                    <p className="px-3 py-4 text-sm text-[var(--text-muted)]">
                      No countries match that search.
                    </p>
                  )}
                {filteredCountries.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onMouseEnter={() => prefetchCountry(c.code)}
                    onFocus={() => prefetchCountry(c.code)}
                    onClick={() => pickCountry(c.code)}
                    className={cn(
                      "w-full min-h-12 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                      countryCode === c.code
                        ? "bg-[color-mix(in_oklab,var(--accent)_22%,transparent)]"
                        : "hover:bg-[var(--card-hover)] active:bg-[var(--card-hover)]",
                    )}
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
                <div className="flex flex-wrap gap-1">
                  {SERVER_POOLS.map((s) => (
                    <button
                      key={String(s.id)}
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
                  <span className="text-[var(--text)] font-medium">{pool.title} pool.</span>{" "}
                  {(() => {
                    const slotKey =
                      server === "auto" ? null : String(server);
                    const slotMsg = slotKey
                      ? servicesQuery.data?.slotStatuses?.[slotKey]?.message
                      : null;
                    if (slotMsg) return slotMsg;
                    return pool.blurb;
                  })()}
                  {servicesRefreshing ? " · updating stock…" : null}
                </p>
              </motion.div>

              <CatalogSearch
                className="mb-4"
                label="Find a service"
                placeholder="Search WhatsApp, Google, OpenAI…"
                value={serviceQ}
                onChange={setServiceQ}
              />

              <div className="grid gap-2 sm:grid-cols-2">
                {servicesLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={`sk-${i}`} className="svc-skeleton min-h-[10.5rem]" />
                  ))}
                {!servicesLoading &&
                  services.map((svc) => {
                    const offer =
                      server === "auto"
                        ? // Auto shows the cheapest in-stock pool (not always Server 1)
                          [...svc.offers]
                            .filter((o) => o.inStock)
                            .sort((a, b) => Number(a.price) - Number(b.price))[0] ??
                          svc.offers[0]
                        : svc.offers.find((o) => o.server === server) ?? svc.offers[0];
                    if (!offer) return null;
                    const inStock =
                      server === "auto"
                        ? svc.offers.some((o) => o.inStock)
                        : offer.inStock;
                    const stockLabel =
                      server === "auto"
                        ? svc.offers.reduce((n, o) => n + (o.inStock ? o.stock : 0), 0)
                        : offer.stock;
                    const affordable = canAfford(offer.price);
                    const buyKey = `${svc.slug}:${String(server)}`;
                    const thisBuying = buyingKey === buyKey;
                    return (
                      <div
                        key={svc.id}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 flex flex-col gap-3 hover:border-[var(--hairline)] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <ServiceLogo slug={svc.slug} name={svc.name} />
                            <div className="min-w-0">
                              <div className="font-semibold tracking-tight truncate">{svc.name}</div>
                              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                                {svc.category ?? "General"}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`badge shrink-0 ${inStock ? "badge-success" : "badge-danger"}`}
                          >
                            {inStock ? `${stockLabel} left` : "Sold out"}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <div className="text-[11px] text-[var(--text-muted)]">Price</div>
                            <div className="mono-data text-[var(--accent)] text-lg">
                              ${offer.price}
                            </div>
                          </div>
                          <div className="text-right text-[11px] text-[var(--text-muted)]">
                            <div className="inline-flex items-center gap-1">
                              <Clock size={12} /> 20 min window
                            </div>
                            <div className="mt-0.5">{pool.label}</div>
                          </div>
                        </div>
                        {!inStock ? (
                          <button type="button" className="btn btn-ghost w-full" disabled>
                            Sold out
                          </button>
                        ) : !affordable ? (
                          <div className="space-y-2">
                            <Link
                              href="/deposit"
                              className="btn btn-primary w-full inline-flex items-center justify-center gap-2 min-h-12"
                            >
                              <Wallet size={15} />
                              Deposit to buy · ${offer.price}
                            </Link>
                            <p className="text-center text-[11px] text-[var(--danger)] font-medium">
                              {shortfallLabel(offer.price)}
                            </p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary w-full min-h-11"
                            disabled={buyInFlight || !session}
                            aria-busy={thisBuying}
                            onClick={() => {
                              if (buyInFlight || !session) return;
                              purchase.mutate({
                                countryCode,
                                serviceSlug: svc.slug,
                                server,
                                _buyKey: buyKey,
                              });
                            }}
                          >
                            {thisBuying ? "Buying…" : "Buy number"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                {!servicesLoading && services.length === 0 && (
                  <p className="col-span-full px-1 py-6 text-sm text-[var(--text-muted)] text-center">
                    No services match that search.
                  </p>
                )}
                {!servicesLoading &&
                  services.length > 0 &&
                  server !== "auto" &&
                  !services.some((svc) =>
                    svc.offers.some((o) => o.server === server && o.inStock),
                  ) && (
                    <p className="col-span-full px-1 py-4 text-sm text-[var(--text-muted)] text-center">
                      {servicesQuery.data?.slotStatuses?.[String(server)]?.message ??
                        "No numbers on this server right now. Try another server or Auto."}
                    </p>
                  )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Side tips when no live order (active order lives at page top) */}
        <AnimatePresence mode="wait">
          {showOrder && !active && (
            <motion.section
              key="order-tips"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="panel panel-accent p-4"
            >
              <h2 className="font-semibold mb-3 tracking-tight">Live order</h2>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3 text-sm text-[var(--text-muted)]"
              >
                <p>Buy a number — the OTP card stays on top of Services until you Cancel.</p>
                <ul className="space-y-2">
                  {[
                    { icon: Clock, t: "20+ minute wait · stays if you leave" },
                    { icon: ShieldCheck, t: "Cancel refund or dismiss after OTP" },
                    { icon: Copy, t: "Phone & OTP copy buttons" },
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
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Order history */}
      <section className="panel p-4">
        <h2 className="font-semibold mb-3 tracking-tight">Order history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Service</th>
                  <th className="py-2 pr-3">Number</th>
                  <th className="py-2 pr-3">OTP</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 25).map((o) => (
                  <tr key={o.id} className="border-b border-[var(--border)]">
                    <td className="py-2.5 pr-3 whitespace-nowrap text-[var(--text-muted)]">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-3">
                      {o.country.flag} {o.service.name}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{o.phoneNumber ?? "—"}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{o.otpCode ?? "—"}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`badge ${statusColor(o.status)}`}>{o.status}</span>
                    </td>
                    <td className="py-2.5 mono-data">${o.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
