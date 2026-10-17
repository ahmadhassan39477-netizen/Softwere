import { prisma } from "@/lib/prisma";
import { purchaseSettingKey } from "@/lib/vpn-proxy";
import type { ProxyEndpoint } from "@/lib/providers/proxy-cheap";

export type VpnPurchase = {
  id: string;
  userId: string;
  providerOrderId: string | null;
  planTitle: string;
  networkType: string;
  retail: number;
  wholesale: number;
  createdAt: string;
  proxies: ProxyEndpoint[];
};

function asPurchases(value: unknown): VpnPurchase[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => row && typeof row === "object") as VpnPurchase[];
}

export async function listPurchases(userId: string): Promise<VpnPurchase[]> {
  const row = await prisma.setting.findUnique({ where: { key: purchaseSettingKey(userId) } });
  if (!row?.value) return [];
  try {
    return asPurchases(JSON.parse(row.value));
  } catch {
    return [];
  }
}

export async function appendPurchase(purchase: VpnPurchase): Promise<VpnPurchase> {
  const key = purchaseSettingKey(purchase.userId);
  const existing = await listPurchases(purchase.userId);
  const next = [purchase, ...existing].slice(0, 50);
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return purchase;
}

export function publicPurchase(purchase: VpnPurchase) {
  return {
    id: purchase.id,
    planTitle: purchase.planTitle,
    networkType: purchase.networkType,
    retail: purchase.retail,
    createdAt: purchase.createdAt,
    providerOrderId: purchase.providerOrderId,
    proxies: purchase.proxies.map((p) => ({
      host: p.host,
      port: p.port,
      username: p.username,
      password: p.password,
      protocol: p.protocol,
    })),
  };
}
