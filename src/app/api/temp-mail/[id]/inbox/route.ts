import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/api-auth";
import { maybeMockInbound } from "@/lib/providers/temp-mail";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const user = await requireUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  const mail = await prisma.tempMail.findFirst({
    where: { id, userId: user.id },
    include: { messages: { orderBy: { receivedAt: "desc" } } },
  });
  if (!mail) return jsonError("Not found", 404);

  // Inject a mock message once after ~5s of mailbox age for demo
  if (
    mail.messages.length === 0 &&
    Date.now() - mail.createdAt.getTime() > 5_000
  ) {
    const mock = maybeMockInbound(mail.address, 0);
    if (mock) {
      await prisma.tempMailMessage.create({
        data: { tempMailId: mail.id, ...mock },
      });
    }
  }

  const refreshed = await prisma.tempMail.findUniqueOrThrow({
    where: { id: mail.id },
    include: { messages: { orderBy: { receivedAt: "desc" } } },
  });

  return Response.json({
    mail: { id: refreshed.id, address: refreshed.address },
    messages: refreshed.messages.map((m) => ({
      id: m.id,
      from: m.fromAddr,
      subject: m.subject,
      textBody: m.textBody,
      htmlBody: m.htmlBody,
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      read: m.read,
      receivedAt: m.receivedAt,
    })),
  });
}
