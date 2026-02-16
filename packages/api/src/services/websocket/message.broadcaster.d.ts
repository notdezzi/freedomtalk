interface Message {
    id: string;
    content: string;
    authorId: string;
    channelId: string | null;
    createdAt: string;
    updatedAt: string;
    isEdited: boolean;
    isDeleted: boolean;
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