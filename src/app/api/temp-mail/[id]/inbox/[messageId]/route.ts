import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { readMessage, TempMailProviderError } from "@/lib/providers/temp-mail";
import { mailboxSecret } from "@/lib/temp-mail-secret";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { id, messageId } = await ctx.params;
  if (!messageId) return jsonError("Message id required", 400);

  const mail = await prisma.tempMail.findFirst({
    where: { id, userId: user.id },
  });
  if (!mail) return jsonError("Not found", 404);

  const secret = await mailboxSecret(mail);
  if (!secret) {
    return jsonError(
      "This address was created before live mail was enabled. Generate a new address.",
      409,
    );
  }

  try {
    const message = await readMessage(mail.address, secret, messageId);
    return Response.json({ mail: { id: mail.id, address: mail.address }, message });
  } catch (err) {
    const message =
      err instanceof TempMailProviderError
        ? err.message
        : "Temp Mail is temporarily unavailable. The inbox service is down. Try again in a minute.";
    const status = err instanceof TempMailProviderError ? err.status : 503;
    return jsonError(message, status);
  }
}
