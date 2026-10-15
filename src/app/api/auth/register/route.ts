import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureUserWithWallet } from "@/lib/users";
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
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) return jsonError("Email already registered", 409);
  } catch (err) {
    console.error("[register] DB unavailable", err instanceof Error ? err.message : err);
    return jsonError(
      "Database unavailable. Confirm DATABASE_URL (Neon) and that tables were created on deploy.",
      503,
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    const user = await prisma.$transaction(async () => {
      const created = await ensureUserWithWallet({
        email,
        name: parsed.data.name,
        passwordHash,
      });
      // If email existed via Google only, attach password
      if (!created.passwordHash) {
        return prisma.user.update({
          where: { id: created.id },
          data: {
            passwordHash,
            name: parsed.data.name ?? created.name,
            balance: created.balance ?? new Prisma.Decimal("0.0000"),
          },
          select: { id: true, email: true, name: true, balance: true },
        });
      }
      return {
        id: created.id,
        email: created.email,
        name: created.name,
        balance: created.balance,
      };
    });

    return Response.json(
      { user: { ...user, balance: "0.0000" } },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    console.error("[register] failed", err instanceof Error ? err.message : err);
    return jsonError("Could not create account. Try again shortly.", 500);
  }
}
