import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { decimalJson } from "@/lib/money";
import {
  filterServicesLiveOrders,
  getDismissedOrderIds,
} from "@/lib/services-panel";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { country: true, service: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const mapped = orders.map((o) => {
    const isGmail =
      o.country.code === "GMAIL" ||
      (o.operator ?? "").toLowerCase().startsWith("mail:gmail");
    return {
      id: o.id,
      status: o.status,
      phoneNumber: o.phoneNumber,
      otpCode: o.otpCode,
      otpMessage: o.otpMessage,
      price: decimalJson(o.price),
      server: o.server,
      serverMode: o.serverMode,
      expiresAt: o.expiresAt,
      createdAt: o.createdAt,
      operator: o.operator,
      networkLabel: o.networkLabel,
      kind: isGmail ? ("gmail" as const) : ("sms" as const),
      country: { code: o.country.code, name: o.country.name, flag: o.country.flag },
      service: { slug: o.service.slug, name: o.service.name },
    };
  });

  const dismissed = await getDismissedOrderIds(user.id);
  const livePanel = filterServicesLiveOrders(mapped, dismissed);

  return Response.json({
    orders: mapped,
    /** Pin these on /services until Cancel (includes RECEIVED with OTP). */
    livePanel,
  });
}
