import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import { decimalJson } from "@/lib/money";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      balance: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  return Response.json({
    users: users.map((u) => ({
      ...u,
      balance: decimalJson(u.balance),
      orderCount: u._count.orders,
      _count: undefined,
    })),
  });
}
