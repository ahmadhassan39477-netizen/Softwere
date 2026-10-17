import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { listMessages, TempMailProviderError } from "@/lib/providers/temp-mail";
import { mailboxCreds } from "@/lib/temp-mail-secret";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  const mail = await prisma.tempMail.findFirst({
    where: { id, userId: user.id },
  });
  if (!mail) return jsonError("Not found", 404);

  const creds = await mailboxCreds(mail);
  if (!creds.secret) {
    return jsonError(
      "This address was created before live mail was enabled. Generate a new address.",
      409,
    );
  }

  if (mail.expiresAt.getTime() < Date.now()) {
    return jsonError("This address expired. Generate a new address.", 410);
  }

  try {
    const messages = await listMessages(mail.address, creds.secret, creds.provider);
    return Response.json({
      mail: { id: mail.id, address: mail.address },
      messages,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof TempMailProviderError
        ? err.message
        : "Temp Mail is temporarily unavailable. The inbox service is down. Try again in a minute.";
    const status = err instanceof TempMailProviderError ? err.status : 503;
    return jsonError(message, status);
  }
}
