"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Store } from "lucide-react";

type Account = { id: string; name: string; catalogId: string | null };
type Product = { id: string; title: string; description: string; price: string };

export function PublishingActions({ product, accounts }: { product: Product; accounts: Account[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value); setCopied(label); setTimeout(() => setCopied(""), 1600);
  }
  async function publishShop() {
    setMessage("Publishing…");
    const response = await fetch("/api/publish/facebook-shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, accountId }) });
    const body = await response.json();
    setMessage(response.ok ? `Published to catalog (ID: ${body.externalId})` : body.error);
  }
  const fields = [{ label: "Title", value: product.title }, { label: "Description", value: product.description }, { label: "Price", value: product.price }];
  return (
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <section className="card p-6"><div className="flex items-center gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Store size={20} /></span><div><h2 className="font-semibold">Facebook Shop / Page Shop</h2><p className="text-sm text-slate-500">Publish through the official Catalog Graph API.</p></div></div>
        <select className="input mt-5" value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Select connected Page</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.catalogId ? "" : " (catalog ID needed)"}</option>)}</select>
        <button className="btn-primary mt-3 w-full" disabled={!accountId} onClick={publishShop}>Publish to Facebook Shop</button>
        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
      </section>
      <section className="card p-6"><div className="flex items-center gap-3"><span className="rounded-lg bg-brand-50 p-2 text-brand-700"><ExternalLink size={20} /></span><div><h2 className="font-semibold">Facebook Marketplace · Manual Assist</h2><p className="text-sm text-slate-500">Marketplace has no public listing API. Copy each field, then paste it into Facebook.</p></div></div>
        <div className="mt-4 space-y-2">{fields.map((field) => <button key={field.label} onClick={() => copy(field.label, field.value)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"><span><b>{field.label}:</b> <span className="text-slate-500">{field.value.slice(0, 45)}{field.value.length > 45 ? "…" : ""}</span></span>{copied === field.label ? <Check size={16} className="text-brand-600" /> : <Copy size={16} />}</button>)}</div>
        <a className="btn-secondary mt-3 w-full" href="https://www.facebook.com/marketplace/create/item" target="_blank" rel="noreferrer">Open Marketplace listing <ExternalLink size={16} /></a>
      </section>
    </div>
  );
}
