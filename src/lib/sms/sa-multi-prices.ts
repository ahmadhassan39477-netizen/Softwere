import { isPlausibleOtpWholesale } from "./otp-price-guards";
import type { ProviderPriceRow } from "./types";

type PriceCell = {
  cost?: string | number;
  price?: string | number;
  count?: string | number;
  physicalCount?: string | number;
};

function cellWholesale(info: PriceCell): number {
  const n = Number(info.cost ?? info.price ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function cellCount(info: PriceCell): number {
  const n = Number(info.count ?? info.physicalCount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isPriceCell(v: unknown): v is PriceCell {
  return Boolean(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      ("cost" in (v as object) || "price" in (v as object) || "count" in (v as object)),
  );
}

function isNumericPriceKey(k: string): boolean {
  return /^\d+(\.\d+)?$/.test(k) && Number(k) > 0;
}

/** Value looks like a provider/activation cell (has USD cost), not a bare count bucket. */
function valueHasUsdCost(info: unknown): boolean {
  if (!info || typeof info !== "object" || Array.isArray(info)) return false;
  const o = info as Record<string, unknown>;
  if (!("cost" in o || "price" in o || "wholesale" in o)) return false;
  const n = Number(o.cost ?? o.price ?? o.wholesale ?? 0);
  return Number.isFinite(n) && n > 0;
}

/** Provider metadata without relying on cost alone (SMSBower/V3 id maps). */
function valueLooksLikeProvider(info: unknown): boolean {
  if (!info || typeof info !== "object" || Array.isArray(info)) return false;
  if (valueHasUsdCost(info)) return true;
  const o = info as Record<string, unknown>;
  return (
    typeof o.name === "string" ||
    typeof o.operator === "string" ||
    "rate" in o ||
    "delivery_percent" in o ||
    "deliveryPercent" in o ||
    "id" in o ||
    "providerId" in o ||
    "provider_id" in o
  );
}

/**
 * True price-bucket map: keys are USD prices, values are stock counts
 * (number or {count}) — NOT provider-id → {cost,count} maps.
 * SMSBower getPricesV3 often returns {"1015":{cost:0.15,count:40}} where
 * 1015 is a provider id; treating that key as USD caused Tier $1015 / $1218 retail.
 */
function isTruePriceBucketMap(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj);
  if (keys.length === 0 || !keys.every(isNumericPriceKey)) return false;
  if (Object.values(obj).some(valueLooksLikeProvider)) return false;
  // Reject absurd keys that cannot be OTP USD (provider ids / stock mis-keys)
  if (keys.some((k) => !isPlausibleOtpWholesale(Number(k)))) return false;
  return true;
}

/**
 * SA/Grizzly getPrices may return:
 * - { [countryId]: { [serviceCode]: { cost, count } } }
 * - { [serviceCode]: { cost, count } } when country is filtered
 */
export function extractSaServicePriceMap(
  json: unknown,
  countryId: string,
): Record<string, PriceCell> | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const tree = json as Record<string, unknown>;
  const nested = tree[String(countryId)] ?? tree[countryId];
  if (isServicePriceMap(nested)) return nested;
  if (isServicePriceMap(tree)) return tree;
  return null;
}

function isServicePriceMap(obj: unknown): obj is Record<string, PriceCell> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const vals = Object.values(obj as Record<string, unknown>);
  if (vals.length === 0) return false;
  if ("error_code" in (obj as object) || "success" in (obj as object)) return false;
  // Reject maps that look like price-bucket trees (numeric keys of cells)
  const keys = Object.keys(obj as object);
  if (keys.length > 0 && keys.every(isNumericPriceKey)) return false;
  return vals.every((v) => isPriceCell(v));
}

type MultiCtx = {
  countryCode: string;
  countryId: string;
  slugByCode: Map<string, string>;
};

/**
 * Parse getPrices / getPricesV2 / getPricesV3 into multiple offer rows.
 * Supports:
 * - Classic single cell per service
 * - Price-bucket maps: service → { "0.07": {count}, "0.15": {count} }
 * - Provider maps/arrays under a service
 * - Nested country → service → …
 */
export function extractSaMultiOffers(json: unknown, ctx: MultiCtx): ProviderPriceRow[] {
  if (!json || typeof json !== "object") return [];
  const rows: ProviderPriceRow[] = [];
  const seen = new Set<string>();

  const push = (partial: {
    serviceSlug: string;
    wholesale: number;
    stock: number;
    operator?: string;
    networkLabel?: string;
    maxPrice?: number;
    providerRate?: number;
  }) => {
    if (!(partial.wholesale > 0)) return;
    if (!(partial.stock > 0)) return;
    // Drop provider-id / RUB / stock-as-price disasters before Auto ranking
    if (!isPlausibleOtpWholesale(partial.wholesale)) return;
    const offerKey = [
      partial.serviceSlug,
      partial.operator ?? "",
      partial.wholesale.toFixed(4),
    ].join(":");
    if (seen.has(offerKey)) return;
    seen.add(offerKey);
    rows.push({
      countryCode: ctx.countryCode,
      serviceSlug: partial.serviceSlug,
      wholesale: partial.wholesale,
      available: true,
      stock: partial.stock,
      operator: partial.operator,
      networkLabel: partial.networkLabel,
      maxPrice: partial.maxPrice ?? partial.wholesale,
      providerRate: partial.providerRate,
      offerKey,
    });
  };

  const resolveSlug = (code: string): string | null =>
    ctx.slugByCode.get(String(code).toLowerCase()) ?? null;

  const walkServiceNode = (serviceCode: string, node: unknown) => {
    const slug = resolveSlug(serviceCode);
    if (!slug || node == null) return;

    // Classic { cost, count }
    if (isPriceCell(node) && !looksLikeBucketOrProviderMap(node)) {
      const cost = cellWholesale(node);
      const count = cellCount(node);
      push({ serviceSlug: slug, wholesale: cost, stock: count, networkLabel: "Any network" });
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) walkProviderLike(slug, item);
      return;
    }

    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;

    // Explicit providers array
    if (Array.isArray(obj.providers)) {
      for (const item of obj.providers) walkProviderLike(slug, item);
      // Also keep top-level cost as any-network if present
      if (isPriceCell(obj)) {
        const cost = cellWholesale(obj);
        const count = cellCount(obj);
        if (cost > 0 && count > 0) {
          push({
            serviceSlug: slug,
            wholesale: cost,
            stock: count,
            networkLabel: "Any network",
          });
        }
      }
      return;
    }

    // All-numeric keys: either USD price buckets OR provider-id → {cost,count}
    const keys = Object.keys(obj);
    if (keys.length > 0 && keys.every(isNumericPriceKey)) {
      if (isTruePriceBucketMap(obj)) {
        for (const [priceKey, info] of Object.entries(obj)) {
          const wholesale = Number(priceKey);
          let stock = 0;
          if (typeof info === "number") stock = info;
          else if (isPriceCell(info)) stock = cellCount(info);
          else if (info && typeof info === "object" && "count" in (info as object)) {
            stock = Number((info as { count?: number }).count ?? 0);
          }
          push({
            serviceSlug: slug,
            wholesale,
            stock,
            networkLabel: `Tier $${wholesale.toFixed(2)}`,
            operator: `tier:${wholesale.toFixed(2)}`,
            maxPrice: wholesale,
          });
        }
        return;
      }
      // Provider id map (SMSBower / getPricesV3): use cell.cost, never the id as USD
      let providerHits = 0;
      for (const [key, info] of Object.entries(obj)) {
        if (walkProviderLike(slug, info, key)) providerHits += 1;
      }
      if (providerHits > 0) return;
    }

    // Mixed / named provider map: { "12": { cost, count, name?, rate? }, ... }
    let providerHits = 0;
    for (const [key, info] of Object.entries(obj)) {
      if (key === "cost" || key === "price" || key === "count" || key === "physicalCount") continue;
      if (walkProviderLike(slug, info, key)) providerHits += 1;
    }
    if (providerHits === 0 && isPriceCell(obj)) {
      push({
        serviceSlug: slug,
        wholesale: cellWholesale(obj),
        stock: cellCount(obj),
        networkLabel: "Any network",
      });
    }
  };

  const walkProviderLike = (
    slug: string,
    item: unknown,
    keyHint?: string,
  ): boolean => {
    if (!item || typeof item !== "object") return false;
    const o = item as Record<string, unknown>;
    const idRaw =
      o.id ?? o.providerId ?? o.provider_id ?? keyHint ?? o.name ?? o.operator;
    const id = idRaw != null ? String(idRaw) : "";
    const wholesale = Number(o.cost ?? o.price ?? o.wholesale ?? 0);
    const stock = Number(o.count ?? o.qty ?? o.stock ?? o.numbers_count ?? 0);
    const rate = Number(o.rate ?? o.delivery_percent ?? o.deliveryPercent ?? NaN);
    const name =
      (typeof o.name === "string" && o.name) ||
      (typeof o.operator === "string" && o.operator) ||
      (id ? `Provider ${id}` : "Network");
    if (!(wholesale > 0) || !(stock > 0)) return false;
    push({
      serviceSlug: slug,
      wholesale,
      stock,
      operator: id || undefined,
      networkLabel: name,
      maxPrice: wholesale,
      providerRate: Number.isFinite(rate) ? rate : undefined,
    });
    return true;
  };

  const root = json as Record<string, unknown>;
  const countryNode =
    root[String(ctx.countryId)] ?? root[ctx.countryId] ?? root;

  if (countryNode && typeof countryNode === "object" && !Array.isArray(countryNode)) {
    for (const [svc, node] of Object.entries(countryNode as Record<string, unknown>)) {
      // Skip if this looks like a country wrapper we already unwrapped wrong
      if (svc === "status" || svc === "data") continue;
      walkServiceNode(svc, node);
    }
  }

  // Some V3 payloads wrap under data
  if (rows.length === 0 && root.data && typeof root.data === "object") {
    return extractSaMultiOffers(root.data, ctx);
  }

  return rows;
}

function looksLikeBucketOrProviderMap(cell: PriceCell & Record<string, unknown>): boolean {
  // If besides cost/count there are nested provider objects, treat as rich node
  for (const [k, v] of Object.entries(cell)) {
    if (["cost", "price", "count", "physicalCount"].includes(k)) continue;
    if (v && typeof v === "object") return true;
  }
  return false;
}
