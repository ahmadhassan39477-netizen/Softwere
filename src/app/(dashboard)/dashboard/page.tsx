import { Boxes, Inbox, Share2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requireUser();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const [products, accounts, messages, recent] = await Promise.all([
    prisma.product.count({ where: { userId: user.id } }),
    prisma.connectedAccount.count({ where: { userId: user.id } }),
    prisma.message.count({ where: { connectedAccount: { userId: user.id }, timestamp: { gte: start } } }),
    prisma.product.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 5 }),
  ]);
  const stats = [
    { name: "Total products", value: products, icon: Boxes, href: "/products" },
    { name: "Connected accounts", value: accounts, icon: Share2, href: "/accounts" },
    { name: "Messages today", value: messages, icon: Inbox, href: "/inbox" },
  ];
  return (
    <>
      <div><p className="text-sm text-slate-500">Overview</p><h1 className="mt-1 text-3xl font-bold">Welcome back, {user.name?.split(" ")[0]}</h1></div>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {stats.map(({ name, value, icon: Icon, href }) => <Link href={href} className="card p-5 transition hover:border-brand-500" key={name}><div className="flex items-center justify-between"><span className="rounded-lg bg-brand-50 p-2.5 text-brand-700"><Icon size={21} /></span><ArrowUpRight size={17} className="text-slate-400" /></div><p className="mt-5 text-3xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-500">{name}</p></Link>)}
      </div>
      <div className="card mt-7 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 p-5"><div><h2 className="font-semibold">Recently updated products</h2><p className="text-sm text-slate-500">Your latest listing activity</p></div><Link href="/products/new" className="btn-primary">Add product</Link></div>
        {recent.length ? <div className="divide-y divide-slate-100">{recent.map((product) => <Link href={`/products/${product.id}`} key={product.id} className="flex items-center justify-between p-5 hover:bg-slate-50"><div><p className="font-medium">{product.title}</p><p className="mt-1 text-sm text-slate-500">SKU {product.sku} · {product.stock} in stock</p></div><div className="text-right"><p className="font-semibold">${product.price.toString()}</p><span className="text-xs text-slate-500">{product.status.toLowerCase()}</span></div></Link>)}</div> : <div className="p-10 text-center text-sm text-slate-500">Add your first product to start building your library.</div>}
      </div>
    </>
  );
}
