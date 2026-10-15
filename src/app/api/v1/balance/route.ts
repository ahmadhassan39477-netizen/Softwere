import { NextRequest } from "next/server";
import { requireUser, jsonError } from "@/lib/api-auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { decimalJson } from "@/lib/money";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = rateLimit(`balance:${user.id}`);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  return Response.json(
    {
      balance: decimalJson(fresh.balance),
      currency: "USD",
      email: fresh.email,
    },
    { headers: rateLimitHeaders(rl) },
  );
}
