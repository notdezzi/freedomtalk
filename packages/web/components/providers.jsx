"use client";
import React from "react";
import { QueryProvider } from "@/lib/query-provider";
export function Providers({ children }) {
    return (<QueryProvider>
      {children}
    </QueryProvider>);
}
//# sourceMappingURL=providers.jsx.map