import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { sendFacebookMessage } from "@/lib/facebook";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = z.object({
    connectedAccountId: z.string().min(1),
    senderId: z.string().min(1),
    messageText: z.string().trim().min(1).max(2000),
  }).safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid message is required." }, { status: 400 });
  }

  const account = await prisma.connectedAccount.findFirst({
    where: {
      id: parsed.data.connectedAccountId,
      userId: session.user.id,
      platform: "FACEBOOK",
    },
  });
  if (!account) {
    return NextResponse.json({ error: "Connected account not found." }, { status: 404 });
  }

  try {
    const result = await sendFacebookMessage(
      decryptSecret(account.accessToken),
      parsed.data.senderId,
      parsed.data.messageText,
    );
    const message = await prisma.message.create({
      data: {
        connectedAccountId: account.id,
        senderId: parsed.data.senderId,
        messageText: parsed.data.messageText,
        timestamp: new Date(),
        isFromUser: false,
        platformMessageId: result.message_id,
      },
    });
    return NextResponse.json(message, { status: 201 });
  } catch (cause) {
    console.error("Facebook manual reply failed", cause);
    return NextResponse.json({ error: "Facebook could not send this message." }, { status: 502 });
  }
}
