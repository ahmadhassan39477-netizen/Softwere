import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/api-auth";
import { decimalJson } from "@/lib/money";

function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  if (phone.length <= 4) return "****";
  return `${"*".repeat(phone.length - 4)}${phone.slice(-4)}`;
}

/**
 * Admin users list + optional per-user OTP order detail (?userId=).
 * Stats: otpRequested (all orders), otpSuccessful (RECEIVED / got code).
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return jsonError("Forbidden", 403);

  const detailId = req.nextUrl.searchParams.get("userId");
  if (detailId) {
    const user = await prisma.user.findUnique({
      where: { id: detailId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        createdAt: true,
      },
    });
    if (!user) return jsonError("User not found", 404);

    const [otpRequested, otpSuccessful, orders] = await Promise.all([
      prisma.order.count({ where: { userId: detailId } }),
      prisma.order.count({
        where: {
          userId: detailId,
          OR: [{ status: "RECEIVED" }, { otpCode: { not: null } }],
        },
      }),
      prisma.order.findMany({
        where: { userId: detailId },
        orderBy: { createdAt: "desc" },
        // Wallet audits need full recent history (aqbeds 100+ buys)
        take: 200,
        include: {
          country: { select: { code: true, name: true, flag: true } },
          service: { select: { slug: true, name: true } },
        },
      }),
    ]);

    return Response.json({
      user: {
        ...user,
        balance: decimalJson(user.balance),
        otpRequested,
        otpSuccessful,
        orderCount: otpRequested,
      },
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        server: o.server,
        hasOtp: Boolean(o.otpCode),
        phoneMasked: maskPhone(o.phoneNumber),
        price: decimalJson(o.price),
        createdAt: o.createdAt,
        expiresAt: o.expiresAt,
        country: o.country,
        service: o.service,
      })),
    });
  }

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

  const userIds = users.map((u) => u.id);
  const successfulRows =
    userIds.length === 0
      ? []
      : await prisma.order.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
            OR: [{ status: "RECEIVED" }, { otpCode: { not: null } }],
          },
          _count: { _all: true },
        });
  const successfulByUser = new Map(
    successfulRows.map((r) => [r.userId, r._count._all]),
  );

  return Response.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      balance: decimalJson(u.balance),
      createdAt: u.createdAt,
      orderCount: u._count.orders,
      otpRequested: u._count.orders,
      otpSuccessful: successfulByUser.get(u.id) ?? 0,
    })),
  });
}
