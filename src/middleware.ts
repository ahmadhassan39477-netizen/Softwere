import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { resolveAuthSecret } from "@/lib/auth-secret";

/**
 * Canonical host + auth gate for app routes.
 */
const CANONICAL_HOST = "www.tempempire.store";

const PROTECTED_PREFIXES = [
  "/services",
  "/deposit",
  "/orders",
  "/account",
  "/settings",
  "/temp-mail",
  "/admin",
];

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const proto = (
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")
  ).toLowerCase();

  if (host === "tempempire.store" || host === CANONICAL_HOST) {
    const needsHost = host !== CANONICAL_HOST;
    const needsHttps = proto === "http";
    if (needsHost || needsHttps) {
      const url = request.nextUrl.clone();
      url.protocol = "https:";
      url.host = CANONICAL_HOST;
      return NextResponse.redirect(url, 308);
    }
  }

  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (needsAuth) {
    const token = await getToken({
      req: request,
      secret: resolveAuthSecret(),
      secureCookie:
        proto === "https" || host === CANONICAL_HOST || host.endsWith(".vercel.app"),
    });
    if (!token?.sub && !(token as { id?: string } | null)?.id) {
      const login = new URL("/login", request.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
