/** Production host. Always www + https. */
export const CANONICAL_HOST = "www.tempempire.store";
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;
export const APEX_HOST = "tempempire.store";

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").toLowerCase().split(":")[0];
}

export function normalizeProto(proto: string | null | undefined): string {
  return (proto ?? "").toLowerCase().replace(/:$/, "");
}

/** True when this request must 301 to https://www.tempempire.store. */
export function needsCanonicalRedirect(host: string, proto: string): boolean {
  const h = normalizeHost(host);
  const p = normalizeProto(proto);
  if (h !== APEX_HOST && h !== CANONICAL_HOST) return false;
  return h !== CANONICAL_HOST || p === "http";
}
