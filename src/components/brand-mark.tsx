/** Original Temp Empire mark — segmented hex inspired by fintech vault/box cues, not a Cashbox clone. */
export function BrandMark({ className = "", size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="40" height="40" rx="10" fill="var(--accent)" />
      <path
        d="M20 8.5L29.5 14v12L20 31.5 10.5 26V14L20 8.5Z"
        stroke="var(--on-accent)"
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M20 14.2L25.8 17.6v6.8L20 27.8l-5.8-3.4v-6.8L20 14.2Z"
        fill="var(--on-accent)"
        opacity="0.92"
      />
      <circle cx="20" cy="20.5" r="2.2" fill="var(--accent)" />
    </svg>
  );
}

/** Clean wordmark — mark + name only (no noisy tagline under the logo). */
export function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-wordmark inline-flex items-center gap-2.5">
      <BrandMark size={compact ? 28 : 32} />
      <span
        className={`font-semibold tracking-[-0.035em] leading-none ${
          compact ? "text-[1.02rem]" : "text-[1.12rem] sm:text-[1.2rem]"
        }`}
      >
        <span className="text-[var(--text)]">temp </span>
        <span className="text-[var(--accent)]">empire</span>
      </span>
    </span>
  );
}
