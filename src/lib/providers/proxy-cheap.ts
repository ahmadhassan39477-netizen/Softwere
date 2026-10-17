/**
 * ProxyCheap HTTP client (WHMCS-style public API).
 * Auth: X-Api-Key + X-Api-Secret against https://api.proxy-cheap.com
 * Never log the key or secret.
 */

import {
  sanitizeProviderError,
  VPN_DEFAULT_BASE_URL,
} from "@/lib/vpn-proxy";

export type ProxyCheapCreds = {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string | null;
};

export type PlanConfig = {
  networkType: string;
  package?: string;
  country?: string;
  ipVersion?: string;
  proxyProtocol?: string;
  authenticationType?: string;
  quantity?: number;
  bandwidth?: number;
  period?: number;
  serviceId?: string;
  planId?: string;
};

export type CatalogPlan = {
  id: string;
  title: string;
  blurb: string;
  networkType: string;
  country?: string;
  wholesale: number;
  periodLabel?: string;
};

export type ProxyEndpoint = {
  host?: string;
  port?: string | number;
  username?: string;
  password?: string;
  protocol?: string;
};

export type PcRequestResult = {
  ok: boolean;
  status: number;
  json: unknown;
  text: string;
};

const NETWORK_LABELS: Record<string, string> = {
  DATACENTER: "Datacenter proxy",
  RESIDENTIAL: "Residential proxy",
  RESIDENTIAL_STATIC: "Static residential proxy",
  MOBILE: "Mobile proxy",
  VPN: "VPN config",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function num(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

function str(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

export function prettyNetwork(raw: string | undefined): string {
  const key = (raw ?? "").toUpperCase().replace(/\s+/g, "_");
  return NETWORK_LABELS[key] ?? (raw?.trim() || "Proxy");
}

export function periodLabel(months: number | null | undefined): string | undefined {
  if (months == null || !Number.isFinite(months) || months <= 0) return undefined;
  return months === 1 ? "1 month" : `${months} months`;
}

export function encodePlanId(config: PlanConfig): string {
  return `pc1.${Buffer.from(JSON.stringify(config), "utf8").toString("base64url")}`;
}

export function decodePlanId(id: string): PlanConfig | null {
  if (!id.startsWith("pc1.")) return null;
  try {
    const parsed = JSON.parse(Buffer.from(id.slice(4), "base64url").toString("utf8")) as unknown;
    const rec = asRecord(parsed);
    if (!rec) return null;
    const networkType = str(rec.networkType);
    if (!networkType) return null;
    return {
      networkType,
      package: str(rec.package),
      country: str(rec.country),
      ipVersion: str(rec.ipVersion),
      proxyProtocol: str(rec.proxyProtocol),
      authenticationType: str(rec.authenticationType),
      quantity: num(rec.quantity) ?? undefined,
      bandwidth: num(rec.bandwidth) ?? undefined,
      period: num(rec.period) ?? undefined,
      serviceId: str(rec.serviceId),
      planId: str(rec.planId),
    };
  } catch {
    return null;
  }
}

function collectArrays(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const obj = asRecord(payload);
  if (!obj) return [];
  for (const key of ["services", "data", "plans", "packages", "items", "results", "products"]) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }
  return [];
}

export function parseServicesPayload(payload: unknown): CatalogPlan[] {
  const plans: CatalogPlan[] = [];
  const seen = new Set<string>();

  function pushPlan(raw: Record<string, unknown>, parent?: Record<string, unknown>) {
    const networkType = (
      str(
        raw.networkType,
        raw.network_type,
        raw.type,
        raw.service,
        raw.serviceType,
        parent?.networkType,
        parent?.type,
        parent?.name,
      ) || "DATACENTER"
    )
      .toUpperCase()
      .replace(/\s+/g, "_");

    const wholesale = num(
      raw.price,
      raw.totalPrice,
      raw.wholesale,
      raw.cost,
      raw.amount,
      raw.monthlyPrice,
    );
    if (wholesale == null || wholesale <= 0) return;

    const packageId = str(raw.package, raw.packageId, raw.id, raw.plan, raw.planId);
    const country = str(raw.country, raw.countryCode, parent?.country);
    const title =
      str(raw.name, raw.title, raw.label) ||
      [prettyNetwork(networkType), country].filter(Boolean).join(" · ");
    const period = num(raw.period, raw.periodInMonths, raw.periodInMoths, parent?.period);
    const bandwidth = num(raw.bandwidth, raw.gb);
    const config: PlanConfig = {
      networkType,
      package: packageId,
      country,
      ipVersion: str(raw.ipVersion, raw.ip_version) || "IPv4",
      proxyProtocol: str(raw.proxyProtocol, raw.protocol) || "HTTP",
      authenticationType: str(raw.authenticationType) || "USERNAME_PASSWORD",
      quantity: num(raw.quantity) || 1,
      bandwidth: bandwidth ?? undefined,
      period: period ?? undefined,
      serviceId: str(parent?.id, raw.service, raw.serviceId),
      planId: str(raw.id, raw.planId),
    };
    const id = encodePlanId(config);
    if (seen.has(id)) return;
    seen.add(id);
    const bits = [
      prettyNetwork(networkType),
      country,
      periodLabel(period),
      bandwidth ? `${bandwidth} GB` : undefined,
    ].filter(Boolean);
    plans.push({
      id,
      title,
      blurb: bits.join(" · ") || prettyNetwork(networkType),
      networkType,
      country,
      wholesale,
      periodLabel: periodLabel(period),
    });
  }

  function walk(items: unknown[], parent?: Record<string, unknown>) {
    for (const item of items) {
      const rec = asRecord(item);
      if (!rec) continue;
      let hadNested = false;
      for (const key of ["plans", "packages", "products", "items", "options"]) {
        if (Array.isArray(rec[key])) {
          walk(rec[key] as unknown[], rec);
          hadNested = true;
        }
      }
      if (!hadNested || num(rec.price, rec.totalPrice, rec.wholesale, rec.cost, rec.amount)) {
        pushPlan(rec, parent);
      }
    }
  }

  walk(collectArrays(payload));
  const single = asRecord(payload);
  if (plans.length === 0 && single && num(single.price, single.totalPrice, single.wholesale)) {
    pushPlan(single);
  }
  return plans;
}

export function parseBalance(payload: unknown): number | null {
  const obj = asRecord(payload);
  if (!obj) return num(payload);
  const nested = asRecord(obj.data) ?? asRecord(obj.account);
  return num(
    obj.balance,
    obj.amount,
    obj.available,
    obj.credits,
    nested?.balance,
    nested?.amount,
  );
}

export function parseOrderId(payload: unknown): string | null {
  const obj = asRecord(payload);
  if (!obj) return typeof payload === "string" && payload.trim() ? payload.trim() : null;
  const nested = asRecord(obj.data) ?? asRecord(obj.order);
  return (
    str(obj.id, obj.orderId, obj.order_id, nested?.id, nested?.orderId) ?? null
  );
}

export function parseProxies(payload: unknown): ProxyEndpoint[] {
  const rows: unknown[] = Array.isArray(payload)
    ? payload
    : collectArrays(payload).length
      ? collectArrays(payload)
      : [];
  const out: ProxyEndpoint[] = [];
  for (const row of rows) {
    const rec = asRecord(row);
    if (!rec) continue;
    const conn = asRecord(rec.connection) ?? asRecord(rec.proxy) ?? rec;
    const host = str(
      conn.publicIp,
      conn.ip,
      conn.host,
      conn.hostname,
      rec.ip,
      rec.host,
    );
    const port = str(conn.port, rec.port);
    if (!host && !port) continue;
    out.push({
      host,
      port: port ?? num(conn.port, rec.port) ?? undefined,
      username: str(conn.username, conn.user, rec.username, rec.user),
      password: str(conn.password, conn.pass, rec.password, rec.pass),
      protocol: str(conn.protocol, rec.protocol, rec.proxyProtocol),
    });
  }
  return out;
}

export function executeBody(config: PlanConfig): Record<string, unknown> {
  const body: Record<string, unknown> = {
    networkType: config.networkType,
    ipVersion: config.ipVersion || "IPv4",
    proxyProtocol: config.proxyProtocol || "HTTP",
    authenticationType: config.authenticationType || "USERNAME_PASSWORD",
    quantity: config.quantity || 1,
  };
  if (config.country) body.country = config.country;
  if (config.package) body.package = config.package;
  if (config.bandwidth != null) body.bandwidth = config.bandwidth;
  if (config.period != null) body.periodInMonths = config.period;
  if (config.serviceId) body.service = config.serviceId;
  if (config.planId) body.plan = config.planId;
  return body;
}

function resolveBase(baseUrl?: string | null): string {
  const raw = (baseUrl ?? "").trim().replace(/\/$/, "");
  return raw || VPN_DEFAULT_BASE_URL;
}

export async function pcRequest(
  creds: ProxyCheapCreds,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<PcRequestResult> {
  const url = `${resolveBase(creds.baseUrl)}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Api-Key": creds.apiKey,
      "X-Api-Secret": creds.apiSecret,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

export function parseQuotedPrice(payload: unknown): number | null {
  const rec = asRecord(payload);
  if (!rec) return num(payload);
  const nested = asRecord(rec.data);
  return num(
    rec.finalPrice,
    rec.unitPrice,
    rec.price,
    rec.totalPrice,
    rec.subtotal,
    rec.amount,
    nested?.finalPrice,
    nested?.price,
    nested?.totalPrice,
  );
}

function errorFromResult(result: PcRequestResult, creds: ProxyCheapCreds): string {
  const rec = asRecord(result.json);
  const code = str(rec?.message, rec?.code, rec?.error);
  if (result.status === 401 || result.status === 403 || /invalid_credentials|unauthorized/i.test(code ?? "")) {
    return "Proxy Cheap rejected the saved key.";
  }
  if (result.status === 404) return "That API path was not found.";
  const raw =
    str(rec?.detail, rec?.title, rec?.errorMessage, asRecord(rec?.error)?.message, code) ||
    `HTTP ${result.status}`;
  if (/rfc2616|symfony\.com|<!doctype/i.test(raw)) return `HTTP ${result.status}`;
  return sanitizeProviderError(raw, [creds.apiKey, creds.apiSecret]);
}

async function firstOk(
  creds: ProxyCheapCreds,
  method: string,
  paths: string[],
  body?: Record<string, unknown>,
): Promise<PcRequestResult> {
  let last: PcRequestResult = { ok: false, status: 0, json: null, text: "" };
  for (const path of paths) {
    last = await pcRequest(creds, method, path, body);
    if (last.ok || last.status === 401 || last.status === 403) return last;
  }
  return last;
}

const CATALOG_SEEDS: Array<{ networkType: string; country: string }> = [
  { networkType: "DATACENTER", country: "US" },
  { networkType: "DATACENTER", country: "GB" },
  { networkType: "DATACENTER", country: "DE" },
  { networkType: "DATACENTER", country: "NL" },
  { networkType: "DATACENTER", country: "CA" },
  { networkType: "RESIDENTIAL_STATIC", country: "US" },
  { networkType: "RESIDENTIAL_STATIC", country: "GB" },
  { networkType: "RESIDENTIAL_STATIC", country: "DE" },
];

export async function buildPricedCatalog(
  creds: ProxyCheapCreds,
): Promise<{ plans: CatalogPlan[]; error?: string; status: number }> {
  const plans: CatalogPlan[] = [];
  let lastStatus = 0;
  for (const seed of CATALOG_SEEDS) {
    const config: PlanConfig = {
      networkType: seed.networkType,
      country: seed.country,
      ipVersion: "IPv4",
      proxyProtocol: "HTTP",
      authenticationType: "USERNAME_PASSWORD",
      quantity: 1,
      period: 1,
    };
    const quoted = await quotePrice(creds, config);
    lastStatus = quoted.status ?? lastStatus;
    if (quoted.status === 401 || quoted.status === 403) {
      return { plans: [], status: quoted.status, error: "Proxy Cheap rejected the saved key." };
    }
    if (quoted.wholesale && quoted.wholesale > 0) {
      plans.push({
        id: encodePlanId(config),
        title: `${prettyNetwork(seed.networkType)} · ${seed.country}`,
        blurb: `${prettyNetwork(seed.networkType)} · ${seed.country} · 1 month`,
        networkType: seed.networkType,
        country: seed.country,
        wholesale: quoted.wholesale,
        periodLabel: "1 month",
      });
    }
  }
  return {
    plans,
    status: lastStatus || 200,
    error: plans.length ? undefined : "No live plans returned yet.",
  };
}

export async function listCatalog(
  creds: ProxyCheapCreds,
): Promise<{ plans: CatalogPlan[]; error?: string; status: number }> {
  const services = await firstOk(creds, "GET", ["services", "v1/services"]);
  if (services.status === 401 || services.status === 403) {
    return { plans: [], status: services.status, error: "Proxy Cheap rejected the saved key." };
  }
  let plans = parseServicesPayload(services.json);
  if (plans.length === 0) {
    const setup = await firstOk(creds, "GET", ["setup", "v1/setup"]);
    if (setup.status === 401 || setup.status === 403) {
      return { plans: [], status: setup.status, error: "Proxy Cheap rejected the saved key." };
    }
    plans = parseServicesPayload(setup.json);
  }
  if (plans.length > 0) return { plans, status: services.status };
  return buildPricedCatalog(creds);
}

export async function quotePrice(
  creds: ProxyCheapCreds,
  config: PlanConfig,
): Promise<{ wholesale: number | null; error?: string; status: number }> {
  const body = executeBody(config);
  const result = await firstOk(creds, "POST", ["order/price", "price"], body);
  if (result.status === 401 || result.status === 403) {
    return { wholesale: null, status: result.status, error: errorFromResult(result, creds) };
  }
  if (!result.ok) return { wholesale: null, status: result.status, error: errorFromResult(result, creds) };
  const wholesale = parseQuotedPrice(result.json);
  if (wholesale == null || wholesale <= 0) {
    return { wholesale: null, status: result.status, error: "No price returned." };
  }
  return { wholesale, status: result.status };
}

export async function executeOrder(
  creds: ProxyCheapCreds,
  config: PlanConfig,
): Promise<{ orderId: string | null; proxies: ProxyEndpoint[]; error?: string; json: unknown }> {
  const body = executeBody(config);
  const result = await firstOk(creds, "POST", ["order/execute", "execute"], body);
  if (!result.ok) {
    return { orderId: null, proxies: [], error: errorFromResult(result, creds), json: result.json };
  }
  const orderId = parseOrderId(result.json);
  let proxies = parseProxies(result.json);
  if (orderId && proxies.length === 0) {
    const fetched = await fetchOrderProxies(creds, orderId);
    proxies = fetched.proxies;
  }
  return { orderId, proxies, json: result.json };
}

export async function fetchOrderProxies(
  creds: ProxyCheapCreds,
  orderId: string,
): Promise<{ proxies: ProxyEndpoint[] }> {
  const result = await firstOk(creds, "GET", [`orders/${orderId}/proxies`, `order/${orderId}/proxies`]);
  return { proxies: result.ok ? parseProxies(result.json) : [] };
}

export async function fetchBalance(creds: ProxyCheapCreds): Promise<number | null> {
  const result = await firstOk(creds, "GET", ["account/balance", "balance"]);
  if (!result.ok) return null;
  return parseBalance(result.json);
}

export async function probeProxyCheap(creds: ProxyCheapCreds): Promise<{
  live: boolean;
  planCount: number;
  balance: number | null;
  error?: string;
}> {
  const [catalog, balance] = await Promise.all([
    listCatalog(creds).catch((e) => ({
      plans: [] as CatalogPlan[],
      status: 0,
      error: sanitizeProviderError(e instanceof Error ? e.message : "Catalog failed", [
        creds.apiKey,
        creds.apiSecret,
      ]),
    })),
    fetchBalance(creds).catch(() => null),
  ]);
  return {
    live: catalog.plans.length > 0 || catalog.status === 200,
    planCount: catalog.plans.length,
    balance,
    error: catalog.error,
  };
}
