/**
 * Promote owner inboxes to ADMIN on whatever DATABASE_URL points at.
 * Never prints connection strings or passwords.
 *
 * Usage:
 *   DATABASE_URL=… npx tsx scripts/promote-owner-admins.ts
 */
import { PrismaClient } from "@prisma/client";

const EXACT = ["hazelann338@gmail.com", "deborfurniture492@gmail.com"];

function isOwner(email: string) {
  const e = email.toLowerCase().trim();
  if (EXACT.includes(e)) return true;
  if (e.includes("dreamedecorebeds")) return true;
  return false;
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  console.info(
    `[promote] target=${url.startsWith("file:") ? "sqlite" : "postgres"} owners=${EXACT.join(",")}+dreamedecorebeds*`,
  );

  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true },
      take: 5000,
    });

    let promoted = 0;
    for (const u of users) {
      if (u.role === "ADMIN") continue;
      if (!isOwner(u.email)) continue;
      await prisma.user.update({
        where: { id: u.id },
        data: { role: "ADMIN" },
      });
      promoted += 1;
      console.info(`[promote] promoted: ${u.email}`);
    }

    for (const email of EXACT) {
      const hit = users.find((u) => u.email.toLowerCase() === email);
      if (!hit) {
        console.info(
          `[promote] no user row yet for ${email} — becomes ADMIN on first sign-in after deploy`,
        );
      } else if (hit.role === "ADMIN" || isOwner(hit.email)) {
        console.info(`[promote] present: ${hit.email} role=${hit.role === "ADMIN" || promoted ? "ADMIN" : hit.role}`);
      }
    }

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
      orderBy: { email: "asc" },
    });
    console.info(
      `[promote] done promoted=${promoted} ADMIN_count=${admins.length} emails=${admins.map((a) => a.email).join(", ")}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[promote] failed", err instanceof Error ? err.message : err);
  process.exit(1);
});
