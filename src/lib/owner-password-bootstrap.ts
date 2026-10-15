import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** One-time site credentials bootstrap for Decor owner (bcrypt only — no plaintext). */
const TARGET_EMAIL = "decorfurniture492@gmail.com";
/** bcrypt cost 10 — site login only; not a Google Account password. */
const PASSWORD_HASH =
  "$2b$10$6.0ol.0ywb6bKK1eKuI2XOHXUWDycE0XMXyNI26BiKee3iZJjkYf.";
const SETTING_KEY = "owner_pw_bootstrap_decor_v1";

/**
 * Ensure Decor owner has site passwordHash + ADMIN.
 * Idempotent via Setting flag. Never logs secrets or plaintext.
 */
export async function ensureDecorOwnerPassword(): Promise<"applied" | "skipped" | "error"> {
  try {
    const done = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (done?.value === "1") return "skipped";

    const email = TARGET_EMAIL;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const rows = await prisma.user.findMany({
        select: { id: true, email: true, role: true, passwordHash: true },
        take: 2000,
      });
      const hit = rows.find((u) => u.email.toLowerCase() === email);
      user = hit
        ? await prisma.user.findUnique({ where: { id: hit.id } })
        : null;
    }

    if (!user) {
      await prisma.user.create({
        data: {
          email,
          name: "Decor",
          role: "ADMIN",
          passwordHash: PASSWORD_HASH,
          balance: new Prisma.Decimal("0.0000"),
          apiKey: `te_live_${nanoid(24)}`,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: PASSWORD_HASH,
          role: "ADMIN",
        },
      });
    }

    await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: "1" },
      update: { value: "1" },
    });
    console.info("[owner-pw-bootstrap] applied for decor owner (hash only)");
    return "applied";
  } catch (err) {
    console.error(
      "[owner-pw-bootstrap] failed",
      err instanceof Error ? err.message : "error",
    );
    return "error";
  }
}
