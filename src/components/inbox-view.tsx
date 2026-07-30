"use client";

import { useMemo, useState } from "react";
import { Bot, MessageSquare } from "lucide-react";

type Account = { id: string; name: string; aiAutoReply: boolean };
type Conversation = {
  id: string; customerName: string; lastMessageAt: string; accountName: string; productTitle: string | null;
  messages: Array<{ id: string; body: string; direction: string; createdAt: string }>;
};

export function InboxView({ initialAccounts, conversations }: { initialAccounts: Account[]; conversations: Conversation[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [selected, setSelected] = useState(conversations[0]?.id || "");
  const conversation = useMemo(() => conversations.find((item) => item.id === selected), [conversations, selected]);
  async function toggle(account: Account) {
    const next = !account.aiAutoReply;
    setAccounts((items) => items.map((item) => item.id === account.id ? { ...item, aiAutoReply: next } : item));
    const response = await fetch(`/api/accounts/${account.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aiAutoReply: next }) });
    if (!response.ok) setAccounts((items) => items.map((item) => item.id === account.id ? account : item));
  }
  return (
    <>
      <div className="mt-7 flex flex-wrap gap-3">{accounts.map((account) => <label key={account.id} className="card flex items-center gap-3 px-4 py-3 text-sm"><Bot size={17} className="text-brand-600" /><span><b>{account.name}</b><span className="block text-xs text-slate-500">AI Auto-Reply {account.aiAutoReply ? "ON" : "OFF"}</span></span><input type="checkbox" checked={account.aiAutoReply} onChange={() => toggle(account)} className="ml-2 h-5 w-5 accent-brand-600" /></label>)}</div>
      <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><b>AI disclosure:</b> Automated replies identify themselves as AI. Review product details and monitor replies. AI can make mistakes.</p>
      <div className="card mt-5 grid min-h-[560px] overflow-hidden md:grid-cols-[300px_1fr]">
        <aside className="border-b border-slate-200 md:border-b-0 md:border-r">
          {conversations.map((item) => <button key={item.id} onClick={() => setSelected(item.id)} className={`w-full border-b border-slate-100 p-4 text-left ${selected === item.id ? "bg-brand-50" : "hover:bg-slate-50"}`}><p className="font-semibold">{item.customerName}</p><p className="mt-1 truncate text-xs text-slate-500">{item.messages.at(-1)?.body}</p><p className="mt-2 text-xs text-slate-400">{item.accountName}</p></button>)}
          {!conversations.length && <div className="p-8 text-center text-sm text-slate-500">No conversations yet.</div>}
        </aside>
        <section className="flex flex-col">
          {conversation ? <><header className="border-b border-slate-200 p-4"><p className="font-semibold">{conversation.customerName}</p><p className="text-xs text-slate-500">{conversation.accountName}{conversation.productTitle ? ` · ${conversation.productTitle}` : ""}</p></header><div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">{conversation.messages.map((message) => <div key={message.id} className={`flex ${message.direction === "OUTBOUND" ? "justify-end" : ""}`}><div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${message.direction === "OUTBOUND" ? "bg-brand-600 text-white" : "border border-slate-200 bg-white"}`}>{message.body}<p className={`mt-1 text-[10px] ${message.direction === "OUTBOUND" ? "text-brand-100" : "text-slate-400"}`}>{new Date(message.createdAt).toLocaleString()}</p></div></div>)}</div></> : <div className="flex flex-1 flex-col items-center justify-center text-slate-400"><MessageSquare size={38} /><p className="mt-3 text-sm">Select a conversation</p></div>}
        </section>
      </div>
    </>
  );
}
