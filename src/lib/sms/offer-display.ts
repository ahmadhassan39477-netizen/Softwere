/**
 * Calm shop-facing copy for OTP offer cards.
 * Hides raw wholesale stock spam and Provider-id clutter.
 */

const RAW_PROVIDER_LABEL =
  /^(providers?\s+[\d,+.\s…]+|provider\d+|network)$/i;

export function isRawProviderLabel(label: string | null | undefined): boolean {
  const t = (label ?? "").trim();
  if (!t) return true;
  return RAW_PROVIDER_LABEL.test(t) || /^\d+(,\d+)*$/.test(t);
}

/** Card / offer stock chip — never dumps raw counts like "156662 LEFT". */
export function stockBadgeLabel(
  inStock: boolean,
  stock?: number,
  variant: "card" | "offer" = "offer",
): string {
  const qty = typeof stock === "number" ? stock : inStock ? 1 : 0;
  if (!inStock || qty <= 0) return "Sold out";
  if (variant === "card") return "In stock";
  if (qty <= 30) return "Limited";
  return "Available";
}

/**
 * Subtle network line for multi-offer rows.
 * Raw "Provider 143" → Primary network / Network 2; keep real carrier names.
 */
export function displayNetworkLabel(
  raw: string | null | undefined,
  idx: number,
  multi: boolean,
): string {
  const label = (raw ?? "").trim();
  if (
    label &&
    !isRawProviderLabel(label) &&
    label.toLowerCase() !== "any network"
  ) {
    return label;
  }
  if (!multi) return "Any network";
  return idx === 0 ? "Primary network" : `Network ${idx + 1}`;
}

/** Rank hint next to network — calm, not "best success". */
export function offerRankHint(idx: number, multi: boolean): string | null {
  if (!multi || idx !== 0) return null;
  return "Top ranked";
}

/** Wholesale adapters: never ship "Provider 143" as the customer-facing label. */
export function wholesaleNetworkLabel(
  nameHint?: string | null,
  idHint?: string | null,
): string {
  const name = (nameHint ?? "").trim();
  if (name && !isRawProviderLabel(name) && !/^provider\d*$/i.test(name)) {
    return name;
  }
  const id = (idHint ?? "").trim();
  if (id && !/^\d+(,\d+)*$/.test(id) && !isRawProviderLabel(id)) {
    return id;
  }
  return "Network";
}
