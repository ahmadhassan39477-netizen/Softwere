import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import {
  exchangeFacebookCode,
  exchangeForLongLivedFacebookToken,
  getFacebookPages,
} from "@/lib/facebook";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const requestUrl = new URL(request.url);
  const appUrl = process.env.NEXTAUTH_URL || requestUrl.origin;

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const expectedState = cookies().get("facebook_oauth_state")?.value;

  if (error) {
    return redirectAndClearState(appUrl, "facebook-access-denied");
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectAndClearState(appUrl, "invalid-oauth-state");
  }

  try {
    const redirectUri = `${appUrl}/api/auth/facebook/callback`;
    const shortLivedToken = await exchangeFacebookCode(code, redirectUri);
    const token = await exchangeForLongLivedFacebookToken(shortLivedToken.access_token);
    const { data: pages } = await getFacebookPages(token.access_token);

    const results = await Promise.all(
      pages.map(async (page) => {
        const existing = await prisma.connectedAccount.findUnique({
          where: { platform_pageId: { platform: "FACEBOOK", pageId: page.id } },
        });
        if (existing && existing.userId !== session.user.id) return false;

        await prisma.connectedAccount.upsert({
          where: { platform_pageId: { platform: "FACEBOOK", pageId: page.id } },
          update: {
            pageName: page.name,
            accessToken: encryptSecret(page.access_token),
            profilePic: page.picture?.data?.url,
          },
          create: {
            userId: session.user.id,
            platform: "FACEBOOK",
            pageName: page.name,
            pageId: page.id,
            accessToken: encryptSecret(page.access_token),
            profilePic: page.picture?.data?.url,
          },
        });
        return true;
      }),
    );

    const response = NextResponse.redirect(
      new URL(`/accounts?connected=${results.filter(Boolean).length}`, appUrl),
    );
    response.cookies.delete("facebook_oauth_state");
    return response;
  } catch (cause) {
    console.error("Facebook OAuth callback failed", cause);
    return redirectAndClearState(appUrl, "facebook-connection-failed");
  }
}

function redirectAndClearState(appUrl: string, error: string) {
  const response = NextResponse.redirect(new URL(`/accounts?error=${error}`, appUrl));
  response.cookies.delete("facebook_oauth_state");
  return response;
}
