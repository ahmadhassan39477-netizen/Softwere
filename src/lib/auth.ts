import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { decimalJson } from "./money";
import { ensureUserWithWallet } from "./users";

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

const authSecret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();

const googleConfigured =
  Boolean(process.env.AUTH_GOOGLE_ID?.trim()) && Boolean(process.env.AUTH_GOOGLE_SECRET?.trim());

async function safeLoadUserById(id: string) {
  try {
    return await prisma.user.findUnique({ where: { id } });
  } catch (err) {
    console.error("[auth] user lookup by id failed (DB/schema?)", err instanceof Error ? err.message : err);
    return null;
  }
}

async function safeLoadUserByEmail(email: string) {
  try {
    return await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  } catch (err) {
    console.error("[auth] user lookup by email failed (DB/schema?)", err instanceof Error ? err.message : err);
    return null;
  }
}

if (!authSecret && process.env.NODE_ENV === "production") {
  console.error(
    "[auth] AUTH_SECRET (or NEXTAUTH_SECRET) is missing. Set it in Vercel → Environment Variables.",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/auth/error",
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

        let user;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (err) {
          console.error("[auth] credentials authorize DB error", err instanceof Error ? err.message : err);
          return null;
        }
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Ensure wallet/apiKey fields exist for older rows
        try {
          user = await ensureUserWithWallet({
            email: user.email,
            name: user.name,
            image: user.image,
          });
        } catch (err) {
          console.error("[auth] ensureUserWithWallet failed", err instanceof Error ? err.message : err);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          balance: decimalJson(user.balance ?? 0),
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
        try {
          const dbUser = await ensureUserWithWallet({
            email: user.email,
            name: user.name,
            image: user.image,
            emailVerified: new Date(),
          });
          user.id = dbUser.id;
          user.role = dbUser.role;
          user.balance = decimalJson(dbUser.balance ?? 0);
          user.apiKey = dbUser.apiKey;
        } catch (err) {
          console.error("[auth] Google signIn DB error", err instanceof Error ? err.message : err);
          return false;
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Prefer configured public app URL in production
      const configured =
        process.env.AUTH_URL?.replace(/\/$/, "") ||
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
        baseUrl;
      if (url.startsWith("/")) return `${configured}${url}`;
      try {
        const target = new URL(url);
        const base = new URL(configured);
        if (target.origin === base.origin) return url;
      } catch {
        /* fall through */
      }
      return `${configured}/services`;
    },
    async jwt({ token, user, trigger, account }) {
      if (user) {
        token.id = user.id!;
        token.sub = user.id!;
        token.role = user.role ?? "USER";
        token.balance = user.balance ?? "0.0000";
        token.apiKey = user.apiKey;
        token.email = user.email;
        token.name = user.name;
      }

      if (account?.provider === "google" && token.email) {
        const fresh = await safeLoadUserByEmail(String(token.email));
        if (fresh) {
          token.id = fresh.id;
          token.sub = fresh.id;
          token.role = fresh.role;
          token.balance = decimalJson(fresh.balance ?? 0);
          token.apiKey = fresh.apiKey;
          token.name = fresh.name;
        }
      }

      // Refresh wallet on update, or lightly on subsequent requests — never crash Auth.js
      if ((trigger === "update" || (!user && token.id)) && token.id) {
        const fresh = await safeLoadUserById(String(token.id));
        if (fresh) {
          token.role = fresh.role;
          token.balance = decimalJson(fresh.balance ?? 0);
          token.apiKey = fresh.apiKey;
          token.name = fresh.name;
          token.email = fresh.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = String(token.id ?? token.sub ?? "");
      session.user.email = String(token.email ?? "");
      session.user.name = token.name as string | null | undefined;
      session.user.role = String(token.role ?? "USER");
      session.user.balance = String(token.balance ?? "0.0000");
      session.user.apiKey = (token.apiKey as string | null | undefined) ?? null;
      return session;
    },
  },
  trustHost: true,
  secret: authSecret,
  debug: process.env.AUTH_DEBUG === "true",
});

export const isGoogleAuthEnabled = googleConfigured;
