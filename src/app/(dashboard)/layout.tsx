import { Sidebar } from "@/components/sidebar";
import { requireUser } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar name={user.name || "User"} plan={user.plan} />
      <main className="lg:pl-64"><div className="mx-auto max-w-7xl p-5 sm:p-8">{children}</div></main>
    </div>
  );
}
