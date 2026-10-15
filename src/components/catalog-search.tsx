"use client";

import { Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type CatalogSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  className?: string;
  autoFocus?: boolean;
};

/**
 * Full search bar: icon in a padded rail so it never overlaps placeholder text.
 * Subtle hover / focus motion — not a one-off pl-* patch.
 */
export function CatalogSearch({
  value,
  onChange,
  placeholder,
  label,
  className,
  autoFocus,
}: CatalogSearchProps) {
  return (
    <label className={cn("catalog-search block", className)}>
      {label ? (
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {label}
        </span>
      ) : null}
      <motion.div
        className="catalog-search__shell group relative flex items-stretch overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] transition-[border-color,box-shadow,background] duration-200"
        whileHover={{ scale: 1.005 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
      >
        <span
          className="catalog-search__rail pointer-events-none flex w-12 shrink-0 items-center justify-center border-r border-[var(--border)] bg-[color-mix(in_oklab,var(--accent)_6%,transparent)] text-[var(--text-muted)] transition-colors duration-200 group-focus-within:border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] group-focus-within:text-[var(--accent)] group-hover:text-[var(--accent)]"
          aria-hidden
        >
          <Search size={18} strokeWidth={2.1} />
        </span>
        <input
          type="search"
          autoFocus={autoFocus}
          className="catalog-search__input min-h-12 w-full flex-1 border-0 bg-transparent px-3.5 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {value ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--text)]"
            aria-label="Clear search"
            onClick={() => onChange("")}
          >
            <X size={15} />
          </button>
        ) : null}
      </motion.div>
    </label>
  );
}
