"use client";
import React from "react";
import { cn } from "@/lib/utils";
export function MessageReactions({ reactions, onAddReaction, onRemoveReaction, }) {
    if (reactions.length === 0)
        return null;
    return (<div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => (<button key={reaction.emoji} onClick={() => {
                if (reaction.me) {
                    onRemoveReaction(reaction.emoji);
                }
                else {
                    onAddReaction(reaction.emoji);
                }
            }} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-sm transition-colors", reaction.me
                ? "bg-[#5865f2]/30 border border-[#5865f2]/50"
                : "bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] border border-transparent")}>
          <span>{reaction.emoji}</span>
          <span className={cn("text-xs font-medium", reaction.me ? "text-[#c9cdfb]" : "text-[var(--text-muted)]")}>
            {reaction.count}
          </span>
        </button>))}
    </div>);
}
//# sourceMappingURL=MessageReactions.jsx.map