import { nanoid } from "nanoid";

/** Public mail.tm API — no key. Override only if the upstream host changes. */
export const MAILTM_API = (process.env.MAILTM_API_URL ?? "https://api.mail.tm").replace(/\/$/, "");
export const MAILTM_ATTRIBUTION_URL = "https://mail.tm";
export const MAILTM_PROVIDER = "mailtm";

const FETCH_MS = 15_000;
const TOKEN_TTL_MS = 50 * 60_000;

export class TempMailProviderError extends Error {
  status: number;
  constructor(message: string, status = 503) {
    super(message);
    this.name = "TempMailProviderError";
    this.status = status;
  }
}

export type TempMailListItem = {
  id: string;
  from: string;
  subject: string;
  intro: string;
  receivedAt: string;
  seen: boolean;
  hasAttachments: boolean;
};

export type TempMailBody = {
  id: string;
  from: string;
  subject: string;
  textBody: string;
  receivedAt: string;
};

type HydraCollection<T> = {
  "hydra:member"?: T[];
  hydra?: { member?: T[] };
};

type MailtmDomain = { domain?: string; isActive?: boolean };
type MailtmAccount = { id?: string; address?: string };
type MailtmToken = { token?: string; id?: string };
type MailtmFrom = { address?: string; name?: string } | string;
type MailtmMessage = {
  id?: string;
  from?: MailtmFrom;
  subject?: string;
  intro?: string;
  text?: string;
  html?: string[] | string;
  seen?: boolean;
  hasAttachments?: boolean;
  createdAt?: string;
};

const tokenCache = new Map<string, { token: string; exp: number }>();

export function providerErrorMessage(status: number, network = false): string {
  if (network) {
    return "Temp Mail is temporarily unavailable. The inbox service is down. Try again in a minute.";
  }
  if (status === 429) {
    return "The inbox service is busy. Wait a few seconds and try again.";
  }
  if (status === 401 || status === 403) {
    return "Could not open this inbox. Generate a new address.";
  }
  if (status === 404) {
    return "That inbox or message was not found. Generate a new address if this keeps happening.";
  }
  if (status === 422) {
    return "The inbox service rejected that address. Try generating again.";
  }
  return "The inbox service returned an error. Try again in a minute.";
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function fromAddress(from?: MailtmFrom): string {
  if (!from) return "unknown";
  if (typeof from === "string") return from;
  if (from.name && from.address) return `${from.name} <${from.address}>`;
  return from.address || from.name || "unknown";
}

function members<T>(data: HydraCollection<T> | T[] | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  return data["hydra:member"] ?? [];
}

async function mailtm<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", "TempEmpire/1.0 (+https://www.tempempire.store)");
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`${MAILTM_API}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(FETCH_MS),
    });
  } catch {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      return mailtm<T>(path, init, attempt + 1);
    }
    throw new TempMailProviderError(providerErrorMessage(0, true), 503);
  }

  if (!res.ok) {
    if (attempt < 2 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      return mailtm<T>(path, init, attempt + 1);
    }
    throw new TempMailProviderError(
      providerErrorMessage(res.status),
      res.status >= 400 && res.status < 500 ? res.status : 502,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function listDomains(): Promise<string[]> {
  const data = await mailtm<HydraCollection<MailtmDomain>>("/domains");
  const domains = members(data)
    .filter((d) => d.isActive !== false && d.domain)
    .map((d) => String(d.domain).toLowerCase());
  if (!domains.length) {
    throw new TempMailProviderError(
      "No inbox domains are available right now. Try again shortly.",
      503,
    );
  }
  return domains;
}

export async function createMailbox(preferredDomain?: string): Promise<{
  address: string;
  domain: string;
  password: string;
}> {
  const domains = await listDomains();
  const domain =
    preferredDomain && domains.includes(preferredDomain.toLowerCase())
      ? preferredDomain.toLowerCase()
      : domains[0];

  let lastErr: TempMailProviderError | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = `te${nanoid(10).toLowerCase()}`;
    const address = `${local}@${domain}`;
    const password = nanoid(24);
    try {
      const created = await mailtm<MailtmAccount>("/accounts", {
        method: "POST",
        body: JSON.stringify({ address, password }),
      });
      const resolved = (created.address || address).toLowerCase();
      return { address: resolved, domain, password };
    } catch (err) {
      lastErr = err instanceof TempMailProviderError ? err : new TempMailProviderError(providerErrorMessage(0, true));
      if (lastErr.status !== 422) throw lastErr;
    }
  }
  throw lastErr ?? new TempMailProviderError(providerErrorMessage(422), 422);
}

export async function getToken(address: string, password: string): Promise<string> {
  const key = address.toLowerCase();
  const cached = tokenCache.get(key);
  if (cached && cached.exp > Date.now()) return cached.token;

  const data = await mailtm<MailtmToken>("/token", {
    method: "POST",
    body: JSON.stringify({ address: key, password }),
  });
  if (!data.token) {
    throw new TempMailProviderError(providerErrorMessage(401), 401);
  }
  tokenCache.set(key, { token: data.token, exp: Date.now() + TOKEN_TTL_MS });
  return data.token;
}

function toListItem(msg: MailtmMessage): TempMailListItem | null {
  if (!msg.id) return null;
  return {
    id: msg.id,
    from: fromAddress(msg.from),
    subject: msg.subject?.trim() || "(no subject)",
    intro: msg.intro?.trim() || "",
    receivedAt: msg.createdAt || new Date().toISOString(),
    seen: Boolean(msg.seen),
    hasAttachments: Boolean(msg.hasAttachments),
  };
}

export async function listMessages(address: string, password: string): Promise<TempMailListItem[]> {
  const token = await getToken(address, password);
  try {
    const data = await mailtm<HydraCollection<MailtmMessage>>("/messages", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return members(data)
      .map(toListItem)
      .filter((m): m is TempMailListItem => Boolean(m));
  } catch (err) {
    if (err instanceof TempMailProviderError && err.status === 401) {
      tokenCache.delete(address.toLowerCase());
      const retry = await getToken(address, password);
      const data = await mailtm<HydraCollection<MailtmMessage>>("/messages", {
        headers: { Authorization: `Bearer ${retry}` },
      });
      return members(data)
        .map(toListItem)
        .filter((m): m is TempMailListItem => Boolean(m));
    }
    throw err;
  }
}

export async function readMessage(
  address: string,
  password: string,
  messageId: string,
): Promise<TempMailBody> {
  const safeId = encodeURIComponent(messageId);
  const token = await getToken(address, password);
  const load = (bearer: string) =>
    mailtm<MailtmMessage>(`/messages/${safeId}`, {
      headers: { Authorization: `Bearer ${bearer}` },
    });

  let msg: MailtmMessage;
  try {
    msg = await load(token);
  } catch (err) {
    if (err instanceof TempMailProviderError && err.status === 401) {
      tokenCache.delete(address.toLowerCase());
      msg = await load(await getToken(address, password));
    } else {
      throw err;
    }
  }

  const html = Array.isArray(msg.html) ? msg.html.join("\n") : msg.html || "";
  const textBody = (msg.text || "").trim() || (html ? htmlToText(html) : "");

  return {
    id: msg.id || messageId,
    from: fromAddress(msg.from),
    subject: msg.subject?.trim() || "(no subject)",
    textBody: textBody || "(empty message)",
    receivedAt: msg.createdAt || new Date().toISOString(),
  };
}

/** Legacy mock helper — never inject inbound mail. */
export function maybeMockInbound(): null {
  return null;
}
