"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, MessageCircle, Search, Send } from "lucide-react";
import { useRouter } from "next/navigation";

type Conversation = {
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
};

export function InboxView({ conversations }: { conversations: Conversation[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(conversations[0]?.id || "");
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [autoReply, setAutoReply] = useState<Record<string, boolean>>(
    Object.fromEntries(conversations.map((item) => [item.accountId, item.aiAutoReply])),
  );
  const selected = conversations.find((item) => item.id === selectedId);
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return conversations.filter(
      (item) =>
        item.senderId.toLowerCase().includes(normalized) ||
        item.accountName.toLowerCase().includes(normalized),
    );
  }, [conversations, query]);

  async function toggleAutoReply(accountId: string) {
    const previous = autoReply[accountId] || false;
    setAutoReply((state) => ({ ...state, [accountId]: !previous }));
    const response = await fetch(`/api/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiAutoReply: !previous }),
    });
    if (!response.ok) setAutoReply((state) => ({ ...state, [accountId]: previous }));
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    setSending(true);
    setSendError("");
    const response = await fetch("/api/messages/facebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connectedAccountId: selected.accountId,
        senderId: selected.senderId,
        messageText: reply,
      }),
    });
    if (response.ok) {
      setReply("");
      router.refresh();
    } else {
      setSendError((await response.json()).error || "Message could not be sent.");
    }
    setSending(false);
  }

  return (
    <div className="card mt-7 grid min-h-[680px] overflow-hidden md:grid-cols-[340px_1fr]">
      <aside className="border-b border-slate-200 bg-white md:border-b-0 md:border-r">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-semibold">Conversations</h2>
          <label className="relative mt-3 block">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input className="input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" />
          </label>
        </div>
        <div className="max-h-[610px] overflow-y-auto">
          {filtered.map((item) => {
            const lastMessage = item.messages.at(-1);
            return (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition ${selectedId === item.id ? "bg-blue-50" : "hover:bg-slate-50"}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                  {item.senderId.slice(-2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">Facebook user</p>
                    <time className="shrink-0 text-[10px] text-slate-400">{formatTime(item.lastMessageAt)}</time>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{lastMessage?.isFromUser ? "" : "You: "}{lastMessage?.messageText}</p>
                  <p className="mt-1 truncate text-[10px] text-slate-400">{item.accountName} · {item.senderId}</p>
                </div>
              </button>
            );
          })}
          {!filtered.length && <div className="p-10 text-center text-sm text-slate-500">No conversations found.</div>}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col bg-white">
        {selected ? (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">{selected.senderId.slice(-2)}</div>
                <div><p className="font-semibold">Facebook user</p><p className="text-xs text-slate-500">{selected.accountName} · PSID {selected.senderId}</p></div>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-full border border-slate-200 px-3 py-2">
                <Bot size={17} className="text-brand-600" />
                <span className="text-xs font-semibold">AI Auto-Reply {autoReply[selected.accountId] ? "ON" : "OFF"}</span>
                <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={autoReply[selected.accountId] || false} onChange={() => toggleAutoReply(selected.accountId)} />
              </label>
            </header>
            <div className="border-b border-amber-100 bg-amber-50 px-5 py-2 text-xs text-amber-800">AI replies use your active Product Library, disclose that they are AI-generated, and may require review.</div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-5">
              {selected.messages.map((message) => (
                <div key={message.id} className={`flex ${message.isFromUser ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${message.isFromUser ? "rounded-bl-md border border-slate-200 bg-white text-slate-800" : "rounded-br-md bg-blue-600 text-white"}`}>
                    <p className="whitespace-pre-wrap">{message.messageText}</p>
                    <time className={`mt-1 block text-[10px] ${message.isFromUser ? "text-slate-400" : "text-blue-100"}`}>{formatTime(message.timestamp)}</time>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendReply} className="border-t border-slate-200 bg-white p-4">
              {sendError && <p className="mb-2 text-xs text-red-600">{sendError}</p>}
              <div className="flex items-end gap-2">
                <textarea className="input min-h-11 resize-none" rows={1} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply…" maxLength={2000} />
                <button className="btn-primary h-11 w-11 shrink-0 p-0" disabled={sending || !reply.trim()} aria-label="Send reply"><Send size={18} /></button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-400"><MessageCircle size={44} /><p className="mt-3 text-sm">Select a conversation to view messages.</p></div>
        )}
      </section>
    </div>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
