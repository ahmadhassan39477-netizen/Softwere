"use client";

const TESTIMONIALS = [
  {
    quote: "Got a US number for WhatsApp OTP in under a minute. Wallet topped up with crypto — simple.",
    name: "Maya K.",
    flag: "🇺🇸",
  },
  {
    quote: "I keep my personal phone private now. Temp Empire’s inbox copied the code before I blinked.",
    name: "Omar R.",
    flag: "🇬🇧",
  },
  {
    quote: "Deposit worked, number worked, refund worked when an SMS never landed. Trust rebuilt.",
    name: "Chioma A.",
    flag: "🇳🇬",
  },
  {
    quote: "Used a disposable India number for Google verification while traveling. Exactly what I needed.",
    name: "Priya S.",
    flag: "🇮🇳",
  },
  {
    quote: "Clean dark UI, clear prices, and support answered my deposit question the same day.",
    name: "Luis M.",
    flag: "🇧🇷",
  },
  {
    quote: "Bought a Germany virtual number for Telegram OTP. No jargon, just the code.",
    name: "Anna W.",
    flag: "🇩🇪",
  },
] as const;

function Card({
  quote,
  name,
  flag,
}: {
  quote: string;
  name: string;
  flag: string;
}) {
  return (
    <figure className="mx-3 w-[min(86vw,320px)] shrink-0 rounded-2xl border border-[var(--border)] bg-[#121212] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-2 text-[var(--accent)] tracking-[0.2em] text-xs" aria-label="5 stars">
        ★★★★★
      </div>
      <blockquote className="text-sm leading-relaxed text-[var(--text)]">“{quote}”</blockquote>
      <figcaption className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="text-base leading-none" aria-hidden>
          {flag}
        </span>
        <span className="font-medium text-[var(--text)]">{name}</span>
      </figcaption>
    </figure>
  );
}

export function TestimonialsMarquee() {
  const loop = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <div className="relative overflow-hidden py-2" aria-label="Customer testimonials">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--bg)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--bg)] to-transparent" />
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {loop.map((t, i) => (
          <Card key={`${t.name}-${i}`} {...t} />
        ))}
      </div>
    </div>
  );
}
