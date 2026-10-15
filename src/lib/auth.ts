import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { decimalJson } from "./money";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      balance: string;
      apiKey?: string | null;
    };
  }

  interface User {
    role: string;
    balance: string;
    apiKey?: string | null;
  }
}

const googleConfigured =
  Boolean(process.env.AUTH_GOOGLE_ID?.trim()) && Boolean(process.env.AUTH_GOOGLE_SECRET?.trim());

async function upsertGoogleUser(input: {
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: existing.name ?? input.name ?? email.split("@")[0],
        image: existing.image ?? input.image,
        emailVerified: existing.emailVerified ?? new Date(),
      },
    });
  }
  return prisma.user.create({
    data: {
      email,
      name: input.name ?? email.split("@")[0],
      image: input.image,
      role: "USER",
      balance: new Prisma.Decimal("0.0000"),
      apiKey: `te_live_${nanoid(24)}`,
      emailVerified: new Date(),
    },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          balance: decimalJson(user.balance),
          apiKey: user.apiKey,
        };
      },
    }),
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        const dbUser = await upsertGoogleUser({
          email: user.email,
          name: user.name,
          image: user.image,
        });
        user.id = dbUser.id;
        user.role = dbUser.role;
        user.balance = decimalJson(dbUser.balance);
        user.apiKey = dbUser.apiKey;
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        const base = new URL(baseUrl);
        if (target.origin === base.origin) return url;
      } catch {
        /* fall through */
      }
      return `${baseUrl}/services`;
    },
    async jwt({ token, user, trigger, account }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role ?? "USER";
        token.balance = user.balance ?? "0.0000";
        token.apiKey = user.apiKey;
        token.email = user.email;
        token.name = user.name;
      }

      if (account?.provider === "google" && token.email) {
        const fresh = await prisma.user.findUnique({
          where: { email: String(token.email).toLowerCase() },
        });
        if (fresh) {
          token.id = fresh.id;
          token.role = fresh.role;
          token.balance = decimalJson(fresh.balance);
          token.apiKey = fresh.apiKey;
          token.name = fresh.name;
        }
      }

      if ((trigger === "update" || (!user && token.id)) && token.id) {
        const fresh = await prisma.user.findUnique({ where: { id: String(token.id) } });
        if (fresh) {
          token.role = fresh.role;
          token.balance = decimalJson(fresh.balance);
          token.apiKey = fresh.apiKey;
          token.name = fresh.name;
          token.email = fresh.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = String(token.id ?? "");
      session.user.email = String(token.email ?? "");
      session.user.name = token.name as string | null | undefined;
      session.user.role = String(token.role ?? "USER");
      session.user.balance = String(token.balance ?? "0.0000");
      session.user.apiKey = (token.apiKey as string | null | undefined) ?? null;
      return session;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
});

export const isGoogleAuthEnabled = googleConfigured;
