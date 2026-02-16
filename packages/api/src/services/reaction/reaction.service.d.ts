export interface Reaction {
    id: string;
    message_id: string;
    user_id: string;
    emoji_type: 'unicode' | 'custom';
    emoji_id: string | null;
    emoji_unicode: string | null;
    created_at: Date;
}
export interface GroupedReaction {
    emoji_type: 'unicode' | 'custom';
    emoji_id: string | null;
    emoji_unicode: string | null;
    count: number;
    users: string[];
    me: boolean;
}
declare class ReactionService {
    addReaction(messageId: string, userId: string, emojiType: 'unicode' | 'custom', emojiId?: string | null, emojiUnicode?: string | null): Promise<Reaction>;
    removeReaction(messageId: string, userId: string, emojiType: 'unicode' | 'custom', emojiId?: string | null, emojiUnicode?: string | null): Promise<boolean>;
    removeAllReactions(messageId: string): Promise<number>;
    removeReactionsByEmoji(messageId: string, emojiType: 'unicode' | 'custom', emojiId?: string | null, emojiUnicode?: string | null): Promise<number>;
    getReactionsByMessage(messageId: string): Promise<GroupedReaction[]>;
    getReactionUsers(messageId: string, emojiType: 'unicode' | 'custom', emojiId?: string | null, emojiUnicode?: string | null, limit?: number, offset?: number): Promise<string[]>;
}
export declare const reactionService: ReactionService;
export {};
//# sourceMappingURL=reaction.service.d.ts.map