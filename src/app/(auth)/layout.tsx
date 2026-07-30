import Link from "next/link";
import { Layers3 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <Link href="/" className="mb-7 flex items-center gap-2 font-bold"><Layers3 className="text-brand-600" /> Platform Listing Manager</Link>
      {children}
    </main>
  );
}
