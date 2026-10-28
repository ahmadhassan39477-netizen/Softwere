/**
 * SMSBower temporary-mail API (same wholesale account as Server 3 OTP).
 * Never logs api_key. Customer UI must never name SMSBower.
 */

import { resolveSmsBowerBaseUrl } from "@/lib/sms/adapters/smsbower";

export const GMAIL_DOMAIN = "gmail.com";
/** Customer retail = wholesale × 1.40 */
export const GMAIL_MARKUP_PERCENT = 40;
/** Synthetic country for Order rows — never shown in the OTP country picker. */
export const GMAIL_COUNTRY_CODE = "GMAIL";
export const GMAIL_OPERATOR = "mail:gmail.com";
export const GMAIL_NETWORK_LABEL = "Gmail";
/**
 * Mirror SMSBower temporary Gmail product (smsbower.app/temporaryMail + mail API):
 * - Address active ~25 minutes
 * - Cancel (setStatus=2) while waiting → refund (“no code, no pay”)
 * - After code: setStatus=3 closes / charges reserved — no customer refund
 * - Auto-close + refund if no code when the window ends
 */
export const GMAIL_TTL_MINUTES = 25;
/** Cancel allowed for the full Gmail wait window (same as product TTL). */
export const GMAIL_CANCEL_WINDOW_SECONDS = GMAIL_TTL_MINUTES * 60;

export function isGmailMailOperator(operator: string | null | undefined): boolean {
  const o = (operator ?? "").trim().toLowerCase();
  return o === GMAIL_OPERATOR || o.startsWith("mail:gmail");
}

export function mailApiBaseFromHandler(handlerBaseUrl?: string | null): string {
  const handler = resolveSmsBowerBaseUrl(handlerBaseUrl);
  try {
    const u = new URL(handler);
    return `${u.origin}/api/mail`;
  } catch {
    return "https://smsbower.page/api/mail";
  }
}

function stripSecrets(text: string, apiKey: string): string {
  let out = (text || "mail_error").slice(0, 200);
  const key = apiKey.trim();
  if (key && out.includes(key)) out = out.split(key).join("[redacted]");
  return out.replace(/api_key=[^&\s]+/gi, "api_key=[redacted]");
}

async function mailGet(
  base: string,
  apiKey: string,
  path: string,
  params: Record<string, string>,
): Promise<unknown> {
  const url = new URL(`${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  const text = (await res.text()).trim();
  if (!text) throw new Error("empty_mail_response");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(stripSecrets(text.slice(0, 120), apiKey) || "mail_parse_failed");
  }
}

export type MailServiceInfo = { code: string; name: string };

/** SA-compatible handler action getMailServicesList. */
export async function listMailServices(
  apiKey: string,
  handlerBaseUrl?: string | null,
): Promise<MailServiceInfo[]> {
  const handler = resolveSmsBowerBaseUrl(handlerBaseUrl);
  const url = new URL(handler);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("action", "getMailServicesList");
  const res = await fetch(url.toString(), { cache: "no-store" });
  const text = (await res.text()).trim();
  if (!text || /^(BAD_KEY|WRONG_KEY|NO_KEY)\b/i.test(text)) return [];
  try {
    const json = JSON.parse(text) as {
      status?: string;
      services?: Array<{ code?: string; name?: string }>;
    };
    if (!Array.isArray(json.services)) return [];
    return json.services
      .map((s) => ({
        code: String(s.code ?? "").trim().toLowerCase(),
        name: String(s.name ?? s.code ?? "").trim(),
      }))
      .filter((s) => s.code);
  } catch {
    return [];
  }
}

export type MailPriceCell = { price: number; count: number };

/**
 * Shape: data[serviceCode][domain] = { price, count }
 * Also tolerate nested service name keys.
 */
export function extractMailPriceRests(json: unknown): Record<string, Record<string, MailPriceCell>> {
  const out: Record<string, Record<string, MailPriceCell>> = {};
  if (!json || typeof json !== "object") return out;
  const root = json as { status?: number | string; data?: unknown };
  const data = root.data ?? json;
  if (!data || typeof data !== "object" || Array.isArray(data)) return out;

  for (const [serviceKey, domains] of Object.entries(data as Record<string, unknown>)) {
    if (!domains || typeof domains !== "object" || Array.isArray(domains)) continue;
    const svc = serviceKey.trim().toLowerCase();
    if (!svc) continue;
    const domainMap: Record<string, MailPriceCell> = {};
    for (const [domainKey, cell] of Object.entries(domains as Record<string, unknown>)) {
      if (!cell || typeof cell !== "object") continue;
      const c = cell as { price?: unknown; count?: unknown; cost?: unknown };
      const price = Number(c.price ?? c.cost ?? 0);
      const count = Number(c.count ?? 0);
      if (!(price > 0) || !(count > 0)) continue;
      domainMap[domainKey.trim().toLowerCase()] = { price, count };
    }
    if (Object.keys(domainMap).length) out[svc] = domainMap;
  }
  return out;
}

export async function getMailPriceRests(
  apiKey: string,
  opts?: { service?: string; domain?: string; handlerBaseUrl?: string | null },
): Promise<Record<string, Record<string, MailPriceCell>>> {
  const base = mailApiBaseFromHandler(opts?.handlerBaseUrl);
  const params: Record<string, string> = {};
  if (opts?.service) params.service = opts.service;
  if (opts?.domain) params.domain = opts.domain;
  const json = await mailGet(base, apiKey, "getPriceRests", params);
  return extractMailPriceRests(json);
}

export type MailActivation = {
  mailId: string;
  email: string;
  wholesaleCost: number;
};

export async function buyMailActivation(
  apiKey: string,
  input: {
    serviceCode: string;
    domain?: string;
    maxPrice?: number;
    handlerBaseUrl?: string | null;
  },
): Promise<MailActivation> {
  const base = mailApiBaseFromHandler(input.handlerBaseUrl);
  const params: Record<string, string> = {
    service: input.serviceCode,
    domain: input.domain ?? GMAIL_DOMAIN,
  };
  if (input.maxPrice != null && input.maxPrice > 0) {
    params.maxPrice = String(input.maxPrice);
  }
  const json = (await mailGet(base, apiKey, "getActivation", params)) as {
    status?: number | string;
    mail?: string;
    mailId?: string | number;
    error?: string;
    price?: number | string;
  };
  const ok = json.status === 1 || json.status === "1" || json.status === "success";
  if (!ok || !json.mail || json.mailId == null) {
    const err = String(json.error ?? "No mails yet");
    if (/insufficient balance/i.test(err)) throw Object.assign(new Error("NO_BALANCE"), { code: "NO_BALANCE" });
    if (/no mails/i.test(err)) throw Object.assign(new Error("NO_STOCK"), { code: "NO_STOCK" });
    throw new Error(stripSecrets(err, apiKey));
  }
  return {
    mailId: String(json.mailId),
    email: String(json.mail).trim(),
    wholesaleCost: Number(json.price ?? 0) || 0,
  };
}

export type MailCodeStatus =
  | { status: "WAIT"; code: null; message: null }
  | { status: "RECEIVED"; code: string; message: string | null }
  | { status: "CANCELLED"; code: null; message: null };

export async function getMailCode(
  apiKey: string,
  mailId: string,
  handlerBaseUrl?: string | null,
): Promise<MailCodeStatus> {
  const base = mailApiBaseFromHandler(handlerBaseUrl);
  try {
    const json = (await mailGet(base, apiKey, "getCode", { mailId })) as {
      status?: number | string;
      code?: string;
      error?: string;
      message?: string;
    };
    const err = String(json.error ?? json.message ?? "");
    if (/cancel/i.test(err)) return { status: "CANCELLED", code: null, message: null };
    const ok = json.status === 1 || json.status === "1" || json.status === "success";
    const code = json.code != null ? String(json.code).trim() : "";
    if (ok && code) {
      return { status: "RECEIVED", code, message: err || null };
    }
    return { status: "WAIT", code: null, message: null };
  } catch {
    return { status: "WAIT", code: null, message: null };
  }
}

/** status: 2 cancel, 3 close after code, 5 wait next code */
export async function setMailStatus(
  apiKey: string,
  mailId: string,
  status: 2 | 3 | 5,
  handlerBaseUrl?: string | null,
): Promise<void> {
  const base = mailApiBaseFromHandler(handlerBaseUrl);
  await mailGet(base, apiKey, "setStatus", {
    id: mailId,
    status: String(status),
  }).catch(() => undefined);
}

export function retailFromGmailWholesale(wholesale: number): number {
  return Number((wholesale * (1 + GMAIL_MARKUP_PERCENT / 100)).toFixed(4));
}
