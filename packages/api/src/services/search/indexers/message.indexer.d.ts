export declare class MessageIndexer {
    indexMessage(message: {
        id: string;
        content: string;
        authorId: string;
        channelId?: string | null;
        serverId?: string | null;
        createdAt: Date;
    }): Promise<void>;
    updateMessage(message: {
        id: string;
        content: string;
        authorId: string;
        channelId?: string | null;
        serverId?: string | null;
        createdAt: Date;
    }): Promise<void>;
    deleteMessage(messageId: string): Promise<void>;
    removeFromIndex(messageId: string): Promise<void>;
    bulkIndex(messages: Array<{
        id: string;
        content: string;
        authorId: string;
        channelId?: string | null;
        serverId?: string | null;
        createdAt: Date;
    }>): Promise<number>;
}
export declare const messageIndexer: MessageIndexer;
//# sourceMappingURL=message.indexer.d.ts.map