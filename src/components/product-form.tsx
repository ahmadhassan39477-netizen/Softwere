"use client";

import { FormEvent, useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type ProductData = {
  id: string; title: string; description: string; price: string; category: string;
  condition: string; images: string[]; sku: string; stock: number; status: string;
};

export function ProductForm({ product }: { product?: ProductData }) {
  const router = useRouter();
  const [title, setTitle] = useState(product?.title || "");
  const [description, setDescription] = useState(product?.description || "");
  const [loading, setLoading] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [error, setError] = useState("");

  async function rewrite() {
    setRewriting(true); setError("");
    const response = await fetch("/api/ai/rewrite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description }) });
    const body = await response.json();
    if (response.ok) { setTitle(body.title); setDescription(body.description); } else setError(body.error);
    setRewriting(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    const body = {
      title, description, price: data.get("price"), category: data.get("category"),
      condition: data.get("condition"), sku: data.get("sku"), stock: data.get("stock"), status: data.get("status"),
      images: String(data.get("images") || "").split("\n").map((url) => url.trim()).filter(Boolean),
    };
    const response = await fetch(product ? `/api/products/${product.id}` : "/api/products", {
      method: product ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.error); setLoading(false); return; }
    router.push(`/products/${result.id}`); router.refresh();
  }

  async function remove() {
    if (!product || !confirm("Delete this product permanently?")) return;
    const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (response.ok) { router.push("/products"); router.refresh(); }
  }

  return (
    <form onSubmit={submit} className="card mt-7 p-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="md:col-span-2"><span className="label">Title</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={150} /></label>
        <label className="md:col-span-2"><span className="label">Description</span><textarea className="input min-h-40" value={description} onChange={(e) => setDescription(e.target.value)} required /></label>
        <div className="md:col-span-2"><button type="button" onClick={rewrite} disabled={rewriting || !title || !description} className="btn-secondary"><Sparkles size={17} className="text-violet-600" />{rewriting ? "Rewriting…" : "Rewrite with AI"}</button><p className="mt-2 text-xs text-slate-500">Optimizes for Facebook Marketplace and keeps the copy under 150 words. Review all AI output before publishing.</p></div>
        <label><span className="label">Price (USD)</span><input className="input" name="price" type="number" min="0" step="0.01" defaultValue={product?.price} required /></label>
        <label><span className="label">Category</span><input className="input" name="category" defaultValue={product?.category} required placeholder="Furniture" /></label>
        <label><span className="label">Condition</span><select className="input" name="condition" defaultValue={product?.condition || "NEW"}><option value="NEW">New</option><option value="LIKE_NEW">Like new</option><option value="GOOD">Good</option><option value="FAIR">Fair</option></select></label>
        <label><span className="label">Status</span><select className="input" name="status" defaultValue={product?.status || "DRAFT"}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select></label>
        <label><span className="label">SKU</span><input className="input" name="sku" defaultValue={product?.sku} required /></label>
        <label><span className="label">Stock</span><input className="input" name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} required /></label>
        <label className="md:col-span-2"><span className="label">Image URLs (one per line)</span><textarea className="input min-h-28" name="images" defaultValue={product?.images.join("\n")} placeholder="https://example.com/product.jpg" /></label>
      </div>
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex items-center justify-between">
        {product ? <button type="button" onClick={remove} className="inline-flex items-center gap-2 text-sm font-semibold text-red-600"><Trash2 size={17} /> Delete</button> : <span />}
        <button className="btn-primary" disabled={loading}>{loading ? "Saving…" : "Save product"}</button>
      </div>
    </form>
  );
}
