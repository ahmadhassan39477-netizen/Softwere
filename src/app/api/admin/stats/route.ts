import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import { decimalJson } from "@/lib/money";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const [users, orders, activeOrders, deposits] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "ACTIVE" } }),
    prisma.transaction.aggregate({
      where: { type: "DEPOSIT", status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  const revenue = await prisma.order.aggregate({
    where: { status: { in: ["RECEIVED", "ACTIVE", "EXPIRED"] } },
    _sum: { price: true },
  });

  return Response.json({
    users,
    orders,
    activeOrders,
    depositVolume: decimalJson(deposits._sum.amount ?? new Prisma.Decimal(0)),
    orderVolume: decimalJson(revenue._sum.price ?? new Prisma.Decimal(0)),
  });
}
