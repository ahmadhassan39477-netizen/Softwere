import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
  if (!process.env.FACEBOOK_APP_ID || !process.env.NEXTAUTH_URL) {
    return NextResponse.redirect(new URL("/accounts?error=facebook-not-configured", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  }

  const state = randomBytes(24).toString("base64url");
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/facebook/callback`;
  const query = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: "pages_show_list,pages_read_engagement,pages_messaging,pages_manage_metadata,catalog_management,business_management",
  });
  const response = NextResponse.redirect(`https://www.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION || "v23.0"}/dialog/oauth?${query}`);
  response.cookies.set("facebook_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
