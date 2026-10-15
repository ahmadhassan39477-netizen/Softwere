import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
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
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Keep users on the host they signed in from (public tunnel, not NEXTAUTH_URL localhost)
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        const base = new URL(baseUrl);
        if (target.origin === base.origin) return url;
      } catch {
        /* fall through */
      }
      return baseUrl;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.balance = user.balance;
        token.apiKey = user.apiKey;
      }
      if (trigger === "update" || (!user && token.id)) {
        const fresh = await prisma.user.findUnique({
          where: { id: String(token.id) },
        });
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
      session.user.id = String(token.id);
      session.user.email = String(token.email ?? "");
      session.user.name = token.name as string | null | undefined;
      session.user.role = String(token.role ?? "USER");
      session.user.balance = String(token.balance ?? "0.0000");
      session.user.apiKey = (token.apiKey as string | null | undefined) ?? null;
      return session;
    },
  },
  // Infer host from request (x-forwarded-host / Host) so tunnels work without pinning localhost
  trustHost: true,
  secret: process.env.AUTH_SECRET,
});
