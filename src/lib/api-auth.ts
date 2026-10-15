import { NextRequest } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";

export type AuthedUser = {
  id: string;
  email: string;
  role: string;
  balance: unknown;
  apiKey: string | null;
};

/** Session cookie or `Authorization: Bearer <apiKey>` / `X-Api-Key`. */
export async function requireUser(req?: NextRequest): Promise<AuthedUser | null> {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user) {
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        balance: user.balance,
        apiKey: user.apiKey,
      };
    }
  }

  if (!req) return null;
  const header =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  if (!header) return null;

  const user = await prisma.user.findUnique({ where: { apiKey: header } });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    balance: user.balance,
    apiKey: user.apiKey,
  };
}

export async function requireAdmin(req?: NextRequest): Promise<AuthedUser | null> {
  const user = await requireUser(req);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}
