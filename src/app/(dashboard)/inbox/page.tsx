import { InboxView } from "@/components/inbox-view";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function InboxPage() {
  const user = await requireUser();
  const messages = await prisma.message.findMany({
    where: { connectedAccount: { userId: user.id, platform: "FACEBOOK" } },
    include: {
      connectedAccount: {
        select: { id: true, pageName: true, profilePic: true, aiAutoReply: true },
      },
    },
    orderBy: { timestamp: "desc" },
    take: 1000,
  });
  const grouped = new Map<string, {
    id: string;
    senderId: string;
    accountId: string;
    accountName: string;
    profilePic: string | null;
    aiAutoReply: boolean;
    lastMessageAt: string;
    messages: Array<{
      id: string;
      messageText: string;
      timestamp: string;
      isFromUser: boolean;
    }>;
  }>();
  for (const message of messages) {
    const id = `${message.connectedAccountId}:${message.senderId}`;
    const conversation = grouped.get(id) || {
      id,
      senderId: message.senderId,
      accountId: message.connectedAccountId,
      accountName: message.connectedAccount.pageName,
      profilePic: message.connectedAccount.profilePic,
      aiAutoReply: message.connectedAccount.aiAutoReply,
      lastMessageAt: message.timestamp.toISOString(),
      messages: [],
    };
    conversation.messages.push({
      id: message.id,
      messageText: message.messageText,
      timestamp: message.timestamp.toISOString(),
      isFromUser: message.isFromUser,
    });
    grouped.set(id, conversation);
  }
  const conversations = Array.from(grouped.values()).map((conversation) => ({
    ...conversation,
    messages: conversation.messages.reverse(),
  }));
  return (
    <>
      <p className="text-sm text-slate-500">Facebook Page conversations</p><h1 className="mt-1 text-3xl font-bold">Unified inbox</h1>
      <InboxView conversations={conversations} />
    </>
  );
}
