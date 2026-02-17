"use client";
import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
export function Modal({ isOpen, onClose, title, description, children, className, size = "md", showCloseButton = true, }) {
    const overlayRef = useRef(null);
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);
    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) {
            onClose();
        }
    };
    if (!isOpen)
        return null;
    const sizes = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
    };
    return (<div ref={overlayRef} onClick={handleOverlayClick} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in">
      <div className={cn("w-full bg-[var(--surface-overlay)] rounded-lg shadow-[var(--shadow-elevation-high)]", "animate-scale-in", sizes[size], className)} role="dialog" aria-modal="true" aria-labelledby={title ? "modal-title" : undefined} aria-describedby={description ? "modal-description" : undefined}>
        {(title || showCloseButton) && (<div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
            {title && (<h2 id="modal-title" className="text-lg font-semibold text-[var(--header-primary)]">
                {title}
              </h2>)}
            {showCloseButton && (<button onClick={onClose} className={cn("w-8 h-8 flex items-center justify-center rounded", "text-[var(--interactive-normal)]", "hover:bg-[var(--bg-modifier-hover)] hover:text-[var(--interactive-hover)]", "transition-colors duration-150", "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]")} aria-label="Close modal">
                <X className="w-5 h-5"/>
              </button>)}
          </div>)}
        {description && (<p id="modal-description" className="px-4 pt-4 text-sm text-[var(--header-secondary)]">
            {description}
          </p>)}
        <div className="p-4">{children}</div>
      </div>
    </div>);
}
//# sourceMappingURL=Modal.jsx.map