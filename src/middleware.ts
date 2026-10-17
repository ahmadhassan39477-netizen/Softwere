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

/** Google Search Console HTML-file verify + public proof — never send to /register. */
function isPublicRootHtml(pathname: string) {
  return (
    pathname === "/gsc-file-public-check.html" ||
    /^\/google[a-z0-9]+\.html$/i.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicRootHtml(pathname)) {
    return NextResponse.next();
  }

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

  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (needsAuth) {
    // Auth.js may mint __Secure-* cookies when AUTH_URL is https (e.g. tunnel/prod)
    // even if this hop is plain http://127.0.0.1 — match the cookie that exists.
    const hasSecureSession =
      request.cookies.has("__Secure-authjs.session-token") ||
      request.cookies.has("__Secure-next-auth.session-token");
    const token = await getToken({
      req: request,
      secret: resolveAuthSecret(),
      secureCookie:
        hasSecureSession ||
        proto === "https" ||
        host === CANONICAL_HOST ||
        host.endsWith(".vercel.app"),
    });
    if (!token?.sub && !(token as { id?: string } | null)?.id) {
      // Signup-first: guests must create an account before Services / Buy / OTP
      const signup = new URL("/register", request.url);
      signup.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signup);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|gsc-file-public-check.html|google[^/]+\\.html$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html|txt|xml)$).*)",
  ],
};
