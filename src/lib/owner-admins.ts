import { prisma } from "@/lib/prisma";
import { ensureDecorOwnerPassword } from "@/lib/owner-password-bootstrap";

/**
 * Sole hardcoded owner ADMIN inbox (case-insensitive).
 * Optional extras: OWNER_ADMIN_EMAILS env (comma-separated), typically the same address.
 * No hazelann / dreamedecorebeds* / Debor typo / other owners.
 */
const EXACT_OWNER_EMAILS = new Set(["decorfurniture492@gmail.com"]);

export function isOwnerAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  if (EXACT_OWNER_EMAILS.has(e)) return true;
  const extras = (process.env.OWNER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return extras.includes(e);
}

export function ownerAdminEmails(): string[] {
  const extras = (process.env.OWNER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...EXACT_OWNER_EMAILS, ...extras])];
}

/**
 * Promote Decorfurniture492@gmail.com to ADMIN; demote every other ADMIN → USER.
 * Idempotent. Never locks the Decor owner out.
 */
export async function ensureOwnerAdminsPromoted(): Promise<number> {
  let changed = 0;
  try {
    await ensureDecorOwnerPassword().catch(() => undefined);

    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true },
      take: 5000,
    });
    for (const u of users) {
      const owner = isOwnerAdminEmail(u.email);
      if (owner && u.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: u.id },
          data: { role: "ADMIN" },
        });
        changed += 1;
      } else if (!owner && u.role === "ADMIN") {
        await prisma.user.update({
          where: { id: u.id },
          data: { role: "USER" },
        });
        changed += 1;
      }
    }
  } catch (err) {
    console.error(
      "[owner-admins] sync failed",
      err instanceof Error ? err.message : err,
    );
  }
  return changed;
}

/**
 * Sync DB role for this user: owner → ADMIN, everyone else → USER if they were ADMIN.
 */
export async function applyOwnerAdminRole<
  T extends { id: string; email: string; role: string },
>(user: T): Promise<T> {
  const owner = isOwnerAdminEmail(user.email);
  if (owner && user.role === "ADMIN") return user;
  if (!owner && user.role !== "ADMIN") return user;

  const nextRole = owner ? "ADMIN" : "USER";
  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: nextRole },
    });
    return { ...user, role: updated.role };
  } catch {
    return { ...user, role: nextRole };
  }
}
