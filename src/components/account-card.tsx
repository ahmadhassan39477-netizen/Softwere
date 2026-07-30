"use client";

import { useState } from "react";
import { Bot, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function AccountCard({ account }: { account: { id: string; name: string; pageId: string; catalogId: string | null; aiAutoReply: boolean } }) {
  const router = useRouter();
  const [catalogId, setCatalogId] = useState(account.catalogId || "");
  const [saved, setSaved] = useState(false);
  async function patch(body: object) {
    const response = await fetch(`/api/accounts/${account.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); router.refresh(); }
  }
  async function remove() {
    if (!confirm(`Disconnect ${account.name}? Stored conversations for this Page will also be removed.`)) return;
    if ((await fetch(`/api/accounts/${account.id}`, { method: "DELETE" })).ok) router.refresh();
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between"><div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Facebook Page</span><h2 className="mt-3 font-semibold">{account.name}</h2><p className="text-xs text-slate-500">Page ID: {account.pageId}</p></div><button onClick={remove} aria-label="Disconnect account" className="text-slate-400 hover:text-red-600"><Trash2 size={18} /></button></div>
      <label className="mt-5 block"><span className="label">Commerce catalog ID</span><div className="flex gap-2"><input className="input" value={catalogId} onChange={(e) => setCatalogId(e.target.value)} placeholder="Required for Shop publishing" /><button className="btn-secondary" onClick={() => patch({ catalogId: catalogId || null })}>{saved ? "Saved" : "Save"}</button></div></label>
      <label className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 p-3"><span className="flex items-center gap-2 text-sm font-medium"><Bot size={17} /> AI auto-reply</span><input type="checkbox" className="h-5 w-5 accent-brand-600" defaultChecked={account.aiAutoReply} onChange={(e) => patch({ aiAutoReply: e.target.checked })} /></label>
    </div>
  );
}
