"use client";
import React from "react";
import { cn } from "@/lib/utils";
const Button = React.forwardRef(({ className, variant = "primary", size = "md", loading = false, fullWidth = false, disabled, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium
      transition-all duration-150 ease-out
      disabled:opacity-50 disabled:cursor-not-allowed
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-primary)]
      select-none
    `;
    const variants = {
        primary: `
        bg-[var(--button-primary-background)] text-white
        hover:bg-[var(--button-primary-background-hover)]
        active:bg-[var(--button-primary-background-active)]
      `,
        secondary: `
        bg-[var(--button-secondary-background)] text-[var(--text-normal)]
        hover:bg-[var(--button-secondary-background-hover)]
        active:bg-[var(--button-secondary-background-active)]
      `,
        danger: `
        bg-[var(--button-danger-background)] text-white
        hover:bg-[var(--button-danger-background-hover)]
        active:bg-[var(--button-danger-background-active)]
      `,
        success: `
        bg-[var(--button-success-background)] text-white
        hover:bg-[var(--button-success-background-hover)]
        active:bg-[var(--button-success-background-active)]
      `,
        ghost: `
        bg-transparent text-[var(--interactive-normal)]
        hover:bg-[var(--bg-modifier-hover)] hover:text-[var(--interactive-hover)]
        active:bg-[var(--bg-modifier-active)]
      `,
        link: `
        bg-transparent text-[var(--text-link)]
        hover:underline
        p-0 h-auto
      `,
    };
    const sizes = {
        sm: "h-8 px-3 text-sm rounded-[var(--radius-sm)]",
        md: "h-10 px-4 text-sm rounded-[var(--radius-md)]",
        lg: "h-12 px-6 text-base rounded-[var(--radius-md)]",
    };
    return (<button ref={ref} className={cn(baseStyles, variants[variant], variant !== "link" && sizes[size], fullWidth && "w-full", className)} disabled={disabled || loading} {...props}>
        {loading && (<svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>)}
        {children}
      </button>);
});
Button.displayName = "Button";
export { Button };
//# sourceMappingURL=Button.jsx.map