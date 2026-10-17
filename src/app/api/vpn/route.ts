import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { debitWallet } from "@/lib/wallet";
import { decimalJson } from "@/lib/money";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  decodePlanId,
  executeOrder,
  listCatalog,
  quotePrice,
} from "@/lib/providers/proxy-cheap";
import { appendPurchase, listPurchases, publicPurchase } from "@/lib/vpn-orders";
import {
  normalizeDisplayName,
  parseEnabled,
  parseMarkupPercent,
  retailFromWholesale,
  sanitizeProviderError,
  VPN_BASE_URL_SETTING_KEY,
  VPN_DEFAULT_BASE_URL,
  VPN_DEFAULT_DISPLAY,
  VPN_DISPLAY_SETTING_KEY,
  VPN_ENABLED_SETTING_KEY,
  VPN_MARKUP_SETTING_KEY,
  VPN_SECRET_SETTING_KEY,
  VPN_SETTING_KEY,
} from "@/lib/vpn-proxy";

function clientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  const real = req.headers.get("x-real-ip")?.trim();
  return real || null;
}

const FALLBACK_PRODUCTS = [
  {
    id: "datacenter",
    title: "Datacenter proxy",
    blurb: "Fast shared IPs for light browsing and checks.",
  },
  {
    id: "residential",
    title: "Residential proxy",
    blurb: "IPs that look like home connections.",
  },
  {
    id: "vpn",
    title: "VPN config",
    blurb: "A config file you import into a VPN app. Not a fake in-browser tunnel.",
  },
];

async function loadVpnConfig() {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          VPN_SETTING_KEY,
          VPN_SECRET_SETTING_KEY,
          VPN_BASE_URL_SETTING_KEY,
          VPN_DISPLAY_SETTING_KEY,
          VPN_ENABLED_SETTING_KEY,
          VPN_MARKUP_SETTING_KEY,
        ],
      },
    },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const apiKey = map[VPN_SETTING_KEY]?.trim() || "";
  const apiSecret = map[VPN_SECRET_SETTING_KEY]?.trim() || "";
  const hasCreds = Boolean(apiKey && apiSecret);
  const enabled = parseEnabled(map[VPN_ENABLED_SETTING_KEY], hasCreds);
  return {
    apiKey,
    apiSecret,
    baseUrl: map[VPN_BASE_URL_SETTING_KEY]?.trim() || VPN_DEFAULT_BASE_URL,
    displayName: normalizeDisplayName(map[VPN_DISPLAY_SETTING_KEY] || VPN_DEFAULT_DISPLAY),
    markupPercent: parseMarkupPercent(map[VPN_MARKUP_SETTING_KEY]),
    enabled,
    ready: enabled && hasCreds,
  };
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const config = await loadVpnConfig();
  const purchases = (await listPurchases(user.id)).map(publicPurchase);

  let plans: Array<{
    id: string;
    title: string;
    blurb: string;
    networkType: string;
    country?: string;
    retail: number;
  }> = [];
  let catalogError: string | null = null;

  if (config.ready) {
    const catalog = await listCatalog({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      baseUrl: config.baseUrl,
    }).catch((e) => ({
      plans: [],
      status: 0,
      error: sanitizeProviderError(e instanceof Error ? e.message : "Catalog failed", [
        config.apiKey,
        config.apiSecret,
      ]),
    }));
    plans = catalog.plans.map((p) => ({
      id: p.id,
      title: p.title,
      blurb: p.blurb,
      networkType: p.networkType,
      country: p.country,
      retail: retailFromWholesale(p.wholesale, config.markupPercent),
    }));
    const rawError = catalog.error ?? (plans.length === 0 ? "No live plans returned yet." : null);
    catalogError = rawError
      ? /rejected|invalid_credentials|unauthorized/i.test(rawError)
        ? "The saved provider key was rejected. Plans appear after Admin saves a valid key."
        : "The catalog did not return plans yet. We will not invent a tunnel or fake endpoints."
      : null;
  }

  const message = !config.ready
    ? "VPN and proxy plans go live when Admin pastes a provider key and turns the provider on. This page will never pretend you are connected."
    : plans.length
      ? "Live plans from the provider Admin connected. Buying charges your wallet. This page will not show a fake connected tunnel."
      : catalogError
        || "A provider key is saved. The catalog did not return plans yet. We will not invent a tunnel or fake endpoints.";

  return Response.json({
    connected: false,
    ready: config.ready,
    enabled: config.enabled,
    displayName: config.displayName,
    currentIp: clientIp(req),
    balance: decimalJson((user.balance as string | number) ?? 0),
    plans,
    purchases,
    products: plans.length ? [] : FALLBACK_PRODUCTS,
    catalogError,
    message,
  });
}

const buySchema = z.object({
  planId: z.string().min(8).max(2000),
});

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`vpn-buy:${user.id}`, 20);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const config = await loadVpnConfig();
  if (!config.ready) {
    return jsonError("VPN & Proxy is not enabled yet.", 409, rateLimitHeaders(rl));
  }

  const body = await req.json().catch(() => null);
  const parsed = buySchema.safeParse(body);
  if (!parsed.success) return jsonError("Choose a plan", 400, rateLimitHeaders(rl));

  const planConfig = decodePlanId(parsed.data.planId);
  if (!planConfig) return jsonError("Unknown plan", 400, rateLimitHeaders(rl));

  const creds = {
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    baseUrl: config.baseUrl,
  };

  const catalog = await listCatalog(creds).catch(() => ({ plans: [], error: undefined, status: 0 }));
  const listed = catalog.plans.find((p) => p.id === parsed.data.planId);
  let wholesale = listed?.wholesale ?? null;
  if (wholesale == null) {
    const quoted = await quotePrice(creds, planConfig);
    wholesale = quoted.wholesale;
    if (wholesale == null) {
      return jsonError(quoted.error || "Could not price this plan.", 409, rateLimitHeaders(rl));
    }
  }

  const retail = retailFromWholesale(wholesale, config.markupPercent);
  const balance = Number((user.balance as string | number) ?? 0);
  if (!Number.isFinite(balance) || balance < retail) {
    return jsonError(
      "Insufficient balance. Add credit on Deposit first.",
      402,
      rateLimitHeaders(rl),
    );
  }

  const executed = await executeOrder(creds, planConfig);
  if (executed.error) {
    return jsonError(executed.error, 409, rateLimitHeaders(rl));
  }

  try {
    const debit = await debitWallet(user.id, retail, {
      type: "PURCHASE",
      method: "proxycheap",
      externalId: executed.orderId ?? undefined,
      meta: JSON.stringify({
        kind: "vpn_proxy",
        title: listed?.title ?? planConfig.networkType,
        wholesale,
      }),
    });

    const purchase = await appendPurchase({
      id: nanoid(12),
      userId: user.id,
      providerOrderId: executed.orderId,
      planTitle: listed?.title ?? planConfig.networkType,
      networkType: planConfig.networkType,
      retail,
      wholesale,
      createdAt: new Date().toISOString(),
      proxies: executed.proxies,
    });

    return Response.json(
      {
        connected: false,
        purchase: publicPurchase(purchase),
        balance: decimalJson(debit.balanceAfter),
        message:
          "Purchase recorded. Credentials appear when the provider provisions them. This page is still not a connected VPN.",
      },
      { status: 201, headers: rateLimitHeaders(rl) },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Wallet charge failed";
    if (/insufficient/i.test(message)) {
      return jsonError("Insufficient balance. Add credit on Deposit first.", 402, rateLimitHeaders(rl));
    }
    return jsonError(message, 500, rateLimitHeaders(rl));
  }
}
