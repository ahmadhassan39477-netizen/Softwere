import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

const facebookDialogUrl = "https://www.facebook.com/v19.0/dialog/oauth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const appUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return NextResponse.redirect(new URL("/accounts?error=facebook-not-configured", appUrl));
  }

  const state = randomBytes(32).toString("base64url");
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    redirect_uri: `${appUrl}/api/auth/facebook/callback`,
    response_type: "code",
    state,
    scope: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_messaging",
      "business_management",
    ].join(","),
  });

  const response = NextResponse.redirect(`${facebookDialogUrl}?${params}`);
  response.cookies.set("facebook_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
