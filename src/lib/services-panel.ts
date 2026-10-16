import { prisma } from "@/lib/prisma";

const LIVE_STATUSES = new Set(["ACTIVE", "PENDING", "WAITING", "RECEIVED"]);

function dismissedKey(userId: string) {
  return `services_dismissed:${userId}`;
}

export async function getDismissedOrderIds(userId: string): Promise<Set<string>> {
  const row = await prisma.setting.findUnique({ where: { key: dismissedKey(userId) } });
  if (!row?.value) return new Set();
  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export async function dismissOrderFromServices(userId: string, orderId: string): Promise<void> {
  const current = await getDismissedOrderIds(userId);
  current.add(orderId);
  // Cap list so Setting stays small
  const ids = [...current].slice(-80);
  await prisma.setting.upsert({
    where: { key: dismissedKey(userId) },
    create: { key: dismissedKey(userId), value: JSON.stringify(ids) },
    update: { value: JSON.stringify(ids) },
  });
}

export function isServicesLiveStatus(status: string): boolean {
  return LIVE_STATUSES.has(status);
}

/** Orders that should pin on /services until Cancel / dismiss / refund. */
export function filterServicesLiveOrders<
  T extends { id: string; status: string },
>(orders: T[], dismissed: Set<string>): T[] {
  return orders.filter(
    (o) => isServicesLiveStatus(o.status) && !dismissed.has(o.id),
  );
}
