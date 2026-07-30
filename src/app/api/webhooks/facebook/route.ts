import { NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto";
import { sendFacebookMessage, verifyFacebookSignature } from "@/lib/facebook";
import { createSalesReply } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

type MessagingEvent = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: { mid: string; text?: string; is_echo?: boolean };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (
    url.searchParams.get("hub.mode") === "subscribe" &&
    url.searchParams.get("hub.verify_token") === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(url.searchParams.get("hub.challenge") || "", { status: 200 });
  }
  return new NextResponse("Verification failed", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyFacebookSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    object: string;
    entry?: Array<{ id: string; messaging?: MessagingEvent[] }>;
  };
  if (payload.object !== "page") return new NextResponse("Ignored", { status: 200 });

  for (const entry of payload.entry || []) {
    const account = await prisma.connectedAccount.findFirst({ where: { pageId: entry.id, platform: "FACEBOOK" } });
    if (!account) continue;
    for (const event of entry.messaging || []) {
      if (!event.message?.text || event.message.is_echo) continue;
      if (await prisma.message.findUnique({ where: { platformMessageId: event.message.mid } })) continue;

      const product = await prisma.product.findFirst({
        where: { userId: account.userId, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
      });
      const conversation = await prisma.conversation.upsert({
        where: {
          accountId_platformConversationId: {
            accountId: account.id,
            platformConversationId: event.sender.id,
          },
        },
        update: { lastMessageAt: new Date(event.timestamp), ...(product ? { productId: product.id } : {}) },
        create: {
          userId: account.userId,
          accountId: account.id,
          productId: product?.id,
          platformConversationId: event.sender.id,
          customerId: event.sender.id,
          customerName: "Facebook customer",
          lastMessageAt: new Date(event.timestamp),
        },
      });
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          platformMessageId: event.message.mid,
          direction: "INBOUND",
          body: event.message.text,
          createdAt: new Date(event.timestamp),
        },
      });

      if (account.aiAutoReply && product) {
        try {
          const details = `${product.title}; ${product.description}; price ${product.price}; stock ${product.stock}`;
          const reply = await createSalesReply(details, event.message.text);
          if (reply) {
            const sent = await sendFacebookMessage(decryptSecret(account.accessToken), event.sender.id, reply);
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                platformMessageId: sent.message_id,
                direction: "OUTBOUND",
                body: reply,
              },
            });
          }
        } catch (error) {
          console.error("Facebook auto-reply failed", error);
        }
      }
    }
  }
  return NextResponse.json({ received: true });
}
