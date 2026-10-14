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

export function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-wordmark inline-flex items-center gap-2.5">
      <BrandMark size={compact ? 28 : 34} />
      <span className="leading-none">
        <span className="block font-semibold tracking-[-0.03em] text-[1.05rem] sm:text-[1.15rem]">
          temp empire
        </span>
        {!compact && (
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
            verification OS
          </span>
        )}
      </span>
    </span>
  );
}
