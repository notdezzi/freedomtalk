import React from "react";
import type { Reaction } from "@/types";
interface MessageReactionsProps {
    reactions: Reaction[];
    onAddReaction: (emoji: string) => void;
    onRemoveReaction: (emoji: string) => void;
    messageId: string;
}
export declare function MessageReactions({ reactions, onAddReaction, onRemoveReaction, }: MessageReactionsProps): React.JSX.Element | null;
export {};
//# sourceMappingURL=MessageReactions.d.ts.map