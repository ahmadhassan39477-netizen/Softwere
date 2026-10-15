import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Canonical host: www.tempempire.store
 * Redirect apex → www (and force https when behind a proxy that sets x-forwarded-proto).
 */
const CANONICAL_HOST = "www.tempempire.store";

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const proto = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")).toLowerCase();

  // Only enforce on the real brand domain (leave localhost / trycloudflare alone)
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
