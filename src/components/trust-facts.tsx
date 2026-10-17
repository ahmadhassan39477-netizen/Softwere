import Link from "next/link";
import { Lock, MessageCircle, RefreshCcw, Shield } from "lucide-react";

const FACTS = [
  {
    icon: Shield,
    t: "Private inbox",
    d: "Your SMS stays on your account. We do not run a public shared-code wall.",
  },
  {
    icon: MessageCircle,
    t: "WhatsApp deposit only",
    d: "Add credit on 03072577778. Nothing auto-charges. Balance updates after we confirm.",
  },
  {
    icon: RefreshCcw,
    t: "Refund if SMS never arrives",
    d: "Eligible orders return credit to your wallet so you can try another number.",
  },
  {
    icon: Lock,
    t: "Written rules",
    d: "Read Privacy and Terms. Email support@tempempire.store or message WhatsApp.",
  },
] as const;

export function TrustFacts() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FACTS.map((item) => (
        <div key={item.t} className="panel px-4 py-4 flex gap-3">
          <item.icon className="text-[var(--accent)] shrink-0 mt-0.5" size={18} />
          <div>
            <div className="font-medium">{item.t}</div>
            <p className="text-sm text-[var(--text-muted)] mt-1 leading-relaxed">{item.d}</p>
          </div>
        </div>
      ))}
      <p className="sm:col-span-2 text-sm text-[var(--text-muted)]">
        <Link href="/privacy" className="text-[var(--accent)]">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="text-[var(--accent)]">
          Terms
        </Link>
        {" · "}
        <Link href="/about" className="text-[var(--accent)]">
          About
        </Link>
        {" · "}
        <Link href="/support" className="text-[var(--accent)]">
          Contact
        </Link>
      </p>
    </div>
  );
}
