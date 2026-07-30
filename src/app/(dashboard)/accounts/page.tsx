import { Globe2, ShieldCheck } from "lucide-react";
import { AccountCard } from "@/components/account-card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function AccountsPage({ searchParams }: { searchParams: { connected?: string; error?: string } }) {
  const user = await requireUser();
  const accounts = await prisma.account.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-slate-500">Integrations</p><h1 className="mt-1 text-3xl font-bold">Connected accounts</h1></div><a className="btn-primary bg-blue-600 hover:bg-blue-700" href="/api/facebook/connect"><Globe2 size={17} /> Connect Facebook</a></div>
      {searchParams.connected && <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">Connected {searchParams.connected} Facebook Page{searchParams.connected === "1" ? "" : "s"}.</p>}
      {searchParams.error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">Facebook connection failed. Check the Meta app configuration and try again.</p>}
      <div className="mt-7 grid gap-5 xl:grid-cols-2">{accounts.map((account) => <AccountCard key={account.id} account={account} />)}{!accounts.length && <div className="card col-span-full p-12 text-center"><Globe2 className="mx-auto text-slate-300" size={38} /><h2 className="mt-4 font-semibold">Connect your first Facebook Page</h2><p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">Use official Facebook Login. We only import Pages you already manage and never create or scrape accounts.</p></div>}</div>
      <div className="mt-7 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><ShieldCheck className="shrink-0" size={20} /><p><b>Official API only.</b> Access tokens are encrypted at rest. You can disconnect a Page at any time. eBay and Etsy connectors can be added through the same modular account layer.</p></div>
    </>
  );
}
