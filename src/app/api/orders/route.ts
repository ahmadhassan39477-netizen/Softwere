import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { decimalJson } from "@/lib/money";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { country: true, service: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return Response.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      phoneNumber: o.phoneNumber,
      otpCode: o.otpCode,
      price: decimalJson(o.price),
      server: o.server,
      expiresAt: o.expiresAt,
      createdAt: o.createdAt,
      country: { code: o.country.code, name: o.country.name, flag: o.country.flag },
      service: { slug: o.service.slug, name: o.service.name },
    })),
  });
}
