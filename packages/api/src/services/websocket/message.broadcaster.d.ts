interface Message {
    id: string;
    content: string;
    authorId: string;
    channelId: string | null;
    createdAt: string;
    updatedAt: string;
    isEdited: boolean;
    isDeleted: boolean;
    embeds?: Array<{
        type?: 'rich' | 'image' | 'video' | 'link' | 'article';
        title?: string;
        description?: string;
        url?: string;
        timestamp?: string;
        color?: number;
        footer_text?: string;
        footer_icon_url?: string;
        image_url?: string;
        thumbnail_url?: string;
        author_name?: string;
        author_url?: string;
        author_icon_url?: string;
        fields?: Array<{
            name: string;
            value: string;
            inline?: boolean;
        }>;
    }>;
}
declare class MessageBroadcaster {
    private readonly DEDUP_TTL;
    broadcastMessage(message: Message): Promise<void>;
    broadcastMessageUpdate(message: Message): Promise<void>;
    broadcastMessageDelete(messageId: string, channelId: string): Promise<void>;
    broadcastToUser(userId: string, event: string, data: any): Promise<void>;
    private isDuplicate;
    private markBroadcast;
}
export declare const messageBroadcaster: MessageBroadcaster;
export {};
//# sourceMappingURL=message.broadcaster.d.ts.map