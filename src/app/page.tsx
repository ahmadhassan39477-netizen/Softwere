import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers3 } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-bold"><Layers3 className="text-brand-600" /> Platform Listing Manager</div>
        <div className="flex gap-3"><Link className="btn-secondary" href="/login">Log in</Link><Link className="btn-primary" href="/signup">Start free</Link></div>
      </nav>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
        <div>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">Marketplace operations, simplified</span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-950">One product library. Every marketplace.</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">Create stronger listings, connect your official business accounts, and handle buyer conversations from one compliant workspace.</p>
          <Link className="btn-primary mt-8" href="/signup">Create your workspace <ArrowRight size={17} /></Link>
          <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-600">
            {["No scraping", "Official APIs", "Manual Marketplace assist"].map((item) => <span className="flex items-center gap-1.5" key={item}><CheckCircle2 size={16} className="text-brand-600" />{item}</span>)}
          </div>
        </div>
        <div className="card p-4">
          <div className="rounded-lg bg-slate-50 p-6">
            <div className="grid grid-cols-3 gap-3">
              {["Products", "Accounts", "Messages"].map((name, index) => <div key={name} className="rounded-lg bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{name}</p><p className="mt-2 text-2xl font-bold">{[128, 3, 24][index]}</p></div>)}
            </div>
            <div className="mt-4 rounded-lg bg-white p-5 shadow-sm">
              <div className="h-3 w-32 rounded bg-slate-200" /><div className="mt-5 h-24 rounded bg-brand-50" /><div className="mt-4 h-3 w-4/5 rounded bg-slate-100" /><div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
