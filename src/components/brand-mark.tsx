/** Green hex PNG — never hide this behind motion/CSS vars (phones then see a blank header). */
const MARK_SRC = "/icon-192.png";

export function BrandMark({
  className = "",
  size = 36,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static public PNG; must paint without JS
    <img
      src={MARK_SRC}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-[22%] ${className}`}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}

/** Clean wordmark — mark + name only (no noisy tagline under the logo). */
export function BrandWordmark({
  compact = false,
  priority = false,
}: {
  compact?: boolean;
  priority?: boolean;
}) {
  return (
    <span className="brand-wordmark inline-flex items-center gap-2.5">
      <BrandMark size={compact ? 28 : 32} priority={priority} />
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
