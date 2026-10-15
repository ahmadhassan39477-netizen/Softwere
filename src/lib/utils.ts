export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (["ACTIVE", "RECEIVED", "COMPLETED", "SUCCESS"].includes(s)) return "badge-success";
  if (["PENDING", "WAIT"].includes(s)) return "badge-pending";
  if (["EXPIRED", "FAILED", "CANCELLED", "REFUNDED", "REJECTED"].includes(s)) return "badge-danger";
  return "badge-pending";
}

export function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.resolve();
}
