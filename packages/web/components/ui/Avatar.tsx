"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "idle" | "dnd" | "offline";
  className?: string;
}

export function Avatar({
  src,
  alt = "Avatar",
  size = "md",
  status,
  className,
}: AvatarProps) {
  const sizes = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  };

  const statusSizes = {
    xs: "w-2 h-2",
    sm: "w-2.5 h-2.5",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
    xl: "w-5 h-5",
  };

  const statusColors = {
    online: "bg-[var(--status-green)]",
    idle: "bg-[var(--status-yellow)]",
    dnd: "bg-[var(--status-red)]",
    offline: "bg-[var(--status-offline)]",
  };

  const getStatusPosition = () => {
    switch (size) {
      case "xs":
        return "-bottom-0.5 -right-0.5";
      case "sm":
        return "-bottom-0.5 -right-0.5";
      case "md":
        return "-bottom-0.5 -right-0.5";
      case "lg":
        return "-bottom-1 -right-1";
      case "xl":
        return "-bottom-1 -right-1";
      default:
        return "-bottom-0.5 -right-0.5";
    }
  };

  return (
    <div className={cn("relative inline-block flex-shrink-0", className)}>
      <div
        className={cn(
          "rounded-full overflow-hidden bg-[var(--bg-tertiary)]",
          sizes[size]
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center",
              "bg-[var(--brand-primary)] text-white font-semibold",
              "text-xs"
            )}
          >
            {alt?.charAt(0).toUpperCase() || "?"}
          </div>
        )}
      </div>
      {status && (
        <div
          className={cn(
            "absolute rounded-full border-[3px] border-[var(--bg-primary)]",
            statusSizes[size],
            statusColors[status],
            getStatusPosition()
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}
