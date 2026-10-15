import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Ensure a User row exists with wallet balance (User.balance).
 * Safe for credentials login, Google OAuth, and register.
 */
export async function ensureUserWithWallet(input: {
  email: string;
  name?: string | null;
  image?: string | null;
  passwordHash?: string | null;
  emailVerified?: Date | null;
}) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const data: Prisma.UserUpdateInput = {};
    if (!existing.name && input.name) data.name = input.name;
    if (!existing.image && input.image) data.image = input.image;
    if (!existing.emailVerified && input.emailVerified) data.emailVerified = input.emailVerified;
    if (!existing.apiKey) data.apiKey = `te_live_${nanoid(24)}`;
    if (input.passwordHash && !existing.passwordHash) data.passwordHash = input.passwordHash;
    if (Object.keys(data).length === 0) return existing;
    return prisma.user.update({ where: { id: existing.id }, data });
  }

  return prisma.user.create({
    data: {
      email,
      name: input.name ?? email.split("@")[0],
      image: input.image,
      passwordHash: input.passwordHash ?? undefined,
      role: "USER",
      balance: new Prisma.Decimal("0.0000"),
      apiKey: `te_live_${nanoid(24)}`,
      emailVerified: input.emailVerified ?? undefined,
    },
  });
}
