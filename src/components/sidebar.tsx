"use client";

import { BarChart3, Boxes, Inbox, Layers3, LogOut, Settings, Share2 } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/accounts", label: "Accounts", icon: Share2 },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ name, plan }: { name: string; plan: string }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-full flex-col border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center gap-2 px-5 font-bold"><Layers3 className="text-brand-600" /> Listing Manager</div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:pt-4">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return <Link key={href} href={href} className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"}`}><Icon size={18} />{label}</Link>;
        })}
      </nav>
      <div className="hidden border-t border-slate-200 p-4 lg:block">
        <p className="truncate text-sm font-semibold">{name}</p><p className="text-xs text-slate-500">{plan} plan</p>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="mt-3 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><LogOut size={16} /> Log out</button>
      </div>
    </aside>
  );
}
