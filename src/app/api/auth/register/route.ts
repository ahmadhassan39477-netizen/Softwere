import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { jsonError } from "@/lib/api-auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const rl = rateLimit(`register:${ip}`, 10);
  if (!rl.success) return jsonError("Rate limit exceeded", 429, rateLimitHeaders(rl));

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input");

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("Email already registered", 409);

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    return tx.user.create({
      data: {
        email,
        name: parsed.data.name ?? email.split("@")[0],
        passwordHash,
        apiKey: `te_live_${nanoid(24)}`,
        role: "USER",
        // Wallet is the User.balance field — start at 0.0000
        balance: new Prisma.Decimal("0.0000"),
      },
      select: { id: true, email: true, name: true, balance: true },
    });
  });

  return Response.json(
    { user: { ...user, balance: "0.0000" } },
    { headers: rateLimitHeaders(rl) },
  );
}
