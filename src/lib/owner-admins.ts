import { prisma } from "@/lib/prisma";
import { ensureDecorOwnerPassword } from "@/lib/owner-password-bootstrap";

/**
 * Owner inboxes that must always have ADMIN (top-up + provider settings).
 * Keep seeded admin@ accounts; never demote them.
 * Matching is always case-insensitive.
 */
const EXACT_OWNER_EMAILS = new Set([
  "hazelann338@gmail.com",
  "decorfurniture492@gmail.com",
]);

export function isOwnerAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  if (EXACT_OWNER_EMAILS.has(e)) return true;
  if (e.includes("dreamedecorebeds")) return true;
  const extras = (process.env.OWNER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return extras.includes(e);
}

export function ownerAdminEmails(): string[] {
  return [...EXACT_OWNER_EMAILS];
}

/** Promote matching users to ADMIN. Idempotent. Never demotes existing admins. */
export async function ensureOwnerAdminsPromoted(): Promise<number> {
  let promoted = 0;
  try {
    // One-time Decor site passwordHash bootstrap (bcrypt only; no plaintext logs)
    await ensureDecorOwnerPassword().catch(() => undefined);

    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true },
      take: 2000,
    });
    for (const u of users) {
      if (u.role === "ADMIN") continue;
      if (!isOwnerAdminEmail(u.email)) continue;
      await prisma.user.update({
        where: { id: u.id },
        data: { role: "ADMIN" },
      });
      promoted += 1;
    }
  } catch (err) {
    console.error(
      "[owner-admins] promote failed",
      err instanceof Error ? err.message : err,
    );
  }
  return promoted;
}

/** If this email should be ADMIN, force role on the row and return fresh user. */
export async function applyOwnerAdminRole<
  T extends { id: string; email: string; role: string },
>(user: T): Promise<T> {
  if (!isOwnerAdminEmail(user.email) || user.role === "ADMIN") return user;
  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });
    return { ...user, role: updated.role };
  } catch {
    return { ...user, role: "ADMIN" };
  }
}
