import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function ProductsPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await requireUser();
  const q = searchParams.q?.trim();
  const products = await prisma.product.findMany({
    where: { userId: user.id, ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <>
      <div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Product library</p><h1 className="mt-1 text-3xl font-bold">Products</h1></div><Link className="btn-primary" href="/products/new"><Plus size={17} /> Add product</Link></div>
      <div className="card mt-7 overflow-hidden">
        <form className="border-b border-slate-200 p-4"><label className="relative block max-w-md"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input className="input pl-10" name="q" defaultValue={q} placeholder="Search by title or SKU" /></label></form>
        {products.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => <tr key={product.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/products/${product.id}`} className="font-semibold hover:text-brand-700">{product.title}</Link><p className="text-xs text-slate-500">{product.category}</p></td><td className="px-5 py-4 text-slate-600">{product.sku}</td><td className="px-5 py-4 font-medium">${product.price.toString()}</td><td className="px-5 py-4">{product.stock}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">{product.status.toLowerCase()}</span></td></tr>)}</tbody></table></div> : <div className="p-14 text-center"><p className="font-semibold">No products found</p><p className="mt-1 text-sm text-slate-500">Create a product or change your search.</p></div>}
      </div>
    </>
  );
}
