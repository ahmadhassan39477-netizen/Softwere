import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";

function missingSecretResponse() {
  const hasSecret = Boolean(process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim());
  if (hasSecret) return null;
  return Response.json(
    {
      error: "Configuration",
      message:
        "AUTH_SECRET is not set. In Vercel → Settings → Environment Variables add AUTH_SECRET (long random string), AUTH_URL=https://www.tempempire.store, AUTH_TRUST_HOST=true, then Redeploy.",
    },
    { status: 500 },
  );
}

export async function GET(req: NextRequest) {
  const early = missingSecretResponse();
  if (early) return early;
  try {
    return await handlers.GET(req);
  } catch (err) {
    console.error("[auth] GET failed", err instanceof Error ? err.message : err);
    return Response.json(
      {
        error: "Configuration",
        message:
          "Auth handler failed. Check AUTH_SECRET, AUTH_URL, DATABASE_URL, and that Neon tables exist (prisma db push).",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const early = missingSecretResponse();
  if (early) return early;
  try {
    return await handlers.POST(req);
  } catch (err) {
    console.error("[auth] POST failed", err instanceof Error ? err.message : err);
    return Response.json(
      {
        error: "Configuration",
        message:
          "Auth handler failed. Check AUTH_SECRET, AUTH_URL, DATABASE_URL, and that Neon tables exist (prisma db push).",
      },
      { status: 500 },
    );
  }
}
