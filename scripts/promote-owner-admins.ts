/**
 * Sync owner ADMIN: only Decorfurniture492@gmail.com (+ OWNER_ADMIN_EMAILS).
 * Demotes every other ADMIN → USER. Never prints passwords or API keys.
 *
 * Usage:
 *   DATABASE_URL=… npx tsx scripts/promote-owner-admins.ts
 */
import { PrismaClient } from "@prisma/client";

const EXACT = ["decorfurniture492@gmail.com"];

function isOwner(email: string) {
  const e = email.toLowerCase().trim();
  if (EXACT.includes(e)) return true;
  const extras = (process.env.OWNER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return extras.includes(e);
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  console.info(
    `[promote] target=${url.startsWith("file:") ? "sqlite" : "postgres"} owners=${EXACT.join(",")}`,
  );

  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true },
      take: 5000,
    });

    let promoted = 0;
    let demoted = 0;
    for (const u of users) {
      const owner = isOwner(u.email);
      if (owner && u.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: u.id },
          data: { role: "ADMIN" },
        });
        promoted += 1;
        console.info(`[promote] promoted: ${u.email}`);
      } else if (!owner && u.role === "ADMIN") {
        await prisma.user.update({
          where: { id: u.id },
          data: { role: "USER" },
        });
        demoted += 1;
        console.info(`[promote] demoted: ${u.email}`);
      }
    }

    for (const email of EXACT) {
      const hit = users.find((u) => u.email.toLowerCase() === email);
      if (!hit) {
        console.info(
          `[promote] no user row yet for ${email} — becomes ADMIN on first sign-in after deploy`,
        );
      } else {
        console.info(`[promote] present: ${hit.email}`);
      }
    }

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
      orderBy: { email: "asc" },
    });
    console.info(
      `[promote] done promoted=${promoted} demoted=${demoted} ADMIN_count=${admins.length} emails=${admins.map((a) => a.email).join(", ")}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[promote] failed", err instanceof Error ? err.message : err);
  process.exit(1);
});
