"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type PasswordFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  className?: string;
  id?: string;
};

/** Accessible show/hide password control — eye sits in a padded rail, not over text. */
export function PasswordField({
  label = "Password",
  value,
  onChange,
  autoComplete = "current-password",
  minLength,
  required,
  className,
  id,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn(className)}>
      <label htmlFor={inputId} className="text-sm text-[var(--text-muted)]">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={inputId}
          className="input pr-12"
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
        />
        <button
          type="button"
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
