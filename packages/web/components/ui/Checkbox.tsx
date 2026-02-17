"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, checked, id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          "flex items-start gap-3 cursor-pointer select-none",
          "group",
          className
        )}
      >
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              "w-5 h-5 rounded-[4px] border-2 transition-all duration-150",
              "border-[var(--interactive-muted)]",
              "peer-checked:bg-[var(--brand-primary)] peer-checked:border-[var(--brand-primary)]",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand-primary)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--bg-primary)]",
              "group-hover:border-[var(--interactive-hover)]",
              "flex items-center justify-center"
            )}
          >
            <Check
              className={cn(
                "w-3 h-3 text-white transition-opacity duration-150",
                checked ? "opacity-100" : "opacity-0"
              )}
              strokeWidth={3}
            />
          </div>
        </div>
        {(label || description || error) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <span className="text-sm text-[var(--text-normal)]">{label}</span>
            )}
            {description && !error && (
              <span className="text-xs text-[var(--text-muted)]">
                {description}
              </span>
            )}
            {error && (
              <span className="text-xs text-[var(--text-danger)]">
                {error}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
