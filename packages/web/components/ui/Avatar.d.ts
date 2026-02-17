import React from "react";
export interface AvatarProps {
    src?: string | null;
    alt?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    status?: "online" | "idle" | "dnd" | "offline";
    className?: string;
}
export declare function Avatar({ src, alt, size, status, className, }: AvatarProps): React.JSX.Element;
//# sourceMappingURL=Avatar.d.ts.map