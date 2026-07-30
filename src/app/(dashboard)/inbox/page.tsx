import { InboxView } from "@/components/inbox-view";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function InboxPage() {
  const user = await requireUser();
  const [accounts, conversations] = await Promise.all([
    prisma.connectedAccount.findMany({ where: { userId: user.id, platform: "FACEBOOK" }, select: { id: true, pageName: true, aiAutoReply: true } }),
    prisma.conversation.findMany({
      where: { userId: user.id },
      include: { account: { select: { pageName: true } }, product: { select: { title: true } }, messages: { orderBy: { createdAt: "asc" }, take: 100 } },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
    }),
  ]);
  const serialized = conversations.map((item) => ({
    id: item.id,
    customerName: item.customerName,
    lastMessageAt: item.lastMessageAt.toISOString(),
    accountName: item.account.pageName,
    productTitle: item.product?.title || null,
    messages: item.messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString() })),
  }));
  return (
    <>
      <p className="text-sm text-slate-500">Facebook Page conversations</p><h1 className="mt-1 text-3xl font-bold">Unified inbox</h1>
      <InboxView initialAccounts={accounts.map(({ pageName, ...account }) => ({ ...account, name: pageName }))} conversations={serialized} />
    </>
  );
}
