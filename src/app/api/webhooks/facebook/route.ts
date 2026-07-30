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

      const products = await prisma.product.findMany({
        where: { userId: account.userId, status: "ACTIVE" },
        orderBy: { title: "asc" },
        select: {
          title: true,
          description: true,
          price: true,
          stock: true,
          condition: true,
          sku: true,
        },
      });
      await prisma.message.create({
        data: {
          connectedAccountId: account.id,
          senderId: event.sender.id,
          messageText: event.message.text,
          timestamp: new Date(event.timestamp),
          isFromUser: true,
          platformMessageId: event.message.mid,
        },
      });

      if (account.aiAutoReply) {
        try {
          const messageText = event.message.text.toLocaleLowerCase();
          const product = [...products]
            .sort((a, b) => b.title.length - a.title.length)
            .find((item) => messageText.includes(item.title.toLocaleLowerCase()));
          const productContext = product
            ? `Matched product: ${product.title}. Description: ${product.description}. Price: ${product.price}. Stock: ${product.stock}. Condition: ${product.condition}. SKU: ${product.sku}.`
            : products.length
              ? `No exact product name was found in the customer's message. Available products: ${products.map((item) => item.title).join(", ")}. Ask which product they mean before giving product-specific details.`
              : "The Product Library has no active products. Explain that product details are unavailable and ask what they are looking for.";
          const reply = await createSalesReply(productContext, event.message.text);
          if (reply) {
            const sent = await sendFacebookMessage(decryptSecret(account.accessToken), event.sender.id, reply);
            await prisma.message.create({
              data: {
                connectedAccountId: account.id,
                senderId: event.sender.id,
                messageText: reply,
                timestamp: new Date(),
                isFromUser: false,
                platformMessageId: sent.message_id,
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
