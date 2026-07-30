import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { exchangeFacebookCode, getFacebookPages } from "@/lib/facebook";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const base = process.env.NEXTAUTH_URL || new URL(request.url).origin;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.redirect(new URL("/login", base));

  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const savedState = cookies().get("facebook_oauth_state")?.value;
  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL("/accounts?error=invalid-oauth-state", base));
  }

  try {
    const redirectUri = `${base}/api/facebook/callback`;
    const token = await exchangeFacebookCode(code, redirectUri);
    const pages = await getFacebookPages(token.access_token);
    await Promise.all(
      pages.data.map((page) =>
        prisma.account.upsert({
          where: {
            userId_platform_pageId: {
              userId: session.user.id,
              platform: "FACEBOOK",
              pageId: page.id,
            },
          },
          update: { name: page.name, externalAccountId: page.id, accessToken: encryptSecret(page.access_token) },
          create: {
            userId: session.user.id,
            name: page.name,
            externalAccountId: page.id,
            pageId: page.id,
            accessToken: encryptSecret(page.access_token),
          },
        }),
      ),
    );
    const response = NextResponse.redirect(new URL(`/accounts?connected=${pages.data.length}`, base));
    response.cookies.delete("facebook_oauth_state");
    return response;
  } catch (error) {
    console.error("Facebook OAuth callback failed", error);
    return NextResponse.redirect(new URL("/accounts?error=facebook-connection-failed", base));
  }
}
