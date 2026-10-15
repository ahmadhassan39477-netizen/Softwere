import { NextRequest } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { applyOwnerAdminRole, isOwnerAdminEmail } from "./owner-admins";

export type AuthedUser = {
  id: string;
  email: string;
  role: string;
  balance: unknown;
  apiKey: string | null;
};

function toAuthed(user: {
  id: string;
  email: string;
  role: string;
  balance: unknown;
  apiKey: string | null;
}): AuthedUser {
  const role = isOwnerAdminEmail(user.email) ? "ADMIN" : user.role;
  if (isOwnerAdminEmail(user.email) && user.role !== "ADMIN") {
    void applyOwnerAdminRole(user).catch(() => undefined);
  }
  return {
    id: user.id,
    email: user.email,
    role,
    balance: user.balance,
    apiKey: user.apiKey,
  };
}

/** Session cookie or `Authorization: Bearer <apiKey>` / `X-Api-Key`. */
export async function requireUser(req?: NextRequest): Promise<AuthedUser | null> {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user) return toAuthed(user);
  }

  // Session may already know owner ADMIN before Neon row is refreshed
  if (session?.user?.email && isOwnerAdminEmail(session.user.email)) {
    const byEmail = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
    });
    if (byEmail) return toAuthed(byEmail);
  }

  if (!req) return null;
  const header =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  if (!header) return null;

  const user = await prisma.user.findUnique({ where: { apiKey: header } });
  if (!user) return null;
  return toAuthed(user);
}

export async function requireAdmin(req?: NextRequest): Promise<AuthedUser | null> {
  const user = await requireUser(req);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}
