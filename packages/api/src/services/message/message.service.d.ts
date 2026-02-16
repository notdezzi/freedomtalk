import { EmbedData } from '../embed/embed.service';
import { ParsedMention, MentionType } from '../formatting/mention.service';
export interface Message {
    id: string;
    content: string;
    author_id: string;
    channel_id: string | null;
    is_edited: boolean;
    edited_at: Date | null;
    is_deleted: boolean;
    deleted_at: Date | null;
    is_pinned: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface MentionData {
    mentions: ParsedMention[];
    mentionCounts: Record<MentionType, number>;
    mentionedUserIds: string[];
}
export interface MessageWithEmbeds extends Message {
    embeds?: EmbedData[];
    mentions?: MentionData;
    parsedContent?: string;
}
export interface MessageHistory {
    id: string;
    message_id: string;
    content: string;
    edited_by: string;
    edited_at: Date;
    created_at: Date;
}
export interface PaginationCursor {
    before?: string;
    after?: string;
    limit?: number;
}
export interface MessageFilter {
    authorId?: string;
    channelId?: string;
    isPinned?: boolean;
    search?: string;
    startDate?: Date;
    endDate?: Date;
}
export interface PaginatedMessages {
    messages: Message[];
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
}
declare class MessageService {
    createMessage(data: {
        content: string;
        authorId: string;
        channelId?: string;
        serverId?: string;
        embeds?: EmbedData[];
    }): Promise<MessageWithEmbeds>;
    private generateLinkPreviewsAsync;
    getMessage(id: string, includeDeleted?: boolean): Promise<Message>;
    getMessages(cursor?: PaginationCursor, filter?: MessageFilter): Promise<PaginatedMessages>;
    updateMessage(id: string, content: string, editorId: string, serverId?: string): Promise<MessageWithEmbeds>;
    softDeleteMessage(id: string, deleterId: string): Promise<void>;
    hardDeleteMessage(id: string): Promise<void>;
    getMessageHistory(messageId: string): Promise<MessageHistory[]>;
    pinMessage(id: string): Promise<Message>;
    unpinMessage(id: string): Promise<Message>;
}
export declare const messageService: MessageService;
export {};
//# sourceMappingURL=message.service.d.ts.map