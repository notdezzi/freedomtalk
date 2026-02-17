"use client";
import React from "react";
import { cn } from "@/lib/utils";
const Input = React.forwardRef(({ className, label, error, hint, icon, iconPosition = "left", type = "text", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (<div className="w-full">
        {label && (<label htmlFor={inputId} className="block text-xs font-semibold text-[var(--text-normal)] uppercase mb-2">
            {label}
          </label>)}
        <div className="relative">
          {icon && iconPosition === "left" && (<div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {icon}
            </div>)}
          <input ref={ref} type={type} id={inputId} className={cn("w-full h-10 px-3 py-0", "bg-[var(--input-background)] text-[var(--text-normal)]", "border-none rounded-[var(--radius-sm)]", "placeholder:text-[var(--input-placeholder)]", "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]", "transition-colors duration-150", "disabled:opacity-50 disabled:cursor-not-allowed", icon && iconPosition === "left" && "pl-10", icon && iconPosition === "right" && "pr-10", error && "ring-2 ring-[var(--text-danger)]", className)} {...props}/>
          {icon && iconPosition === "right" && (<div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {icon}
            </div>)}
        </div>
        {error && (<p className="mt-1 text-xs text-[var(--text-danger)]">{error}</p>)}
        {hint && !error && (<p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>)}
      </div>);
});
Input.displayName = "Input";
export { Input };
//# sourceMappingURL=Input.jsx.map