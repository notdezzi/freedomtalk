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
declare class MessageRouter {
    routeMessage(message: Message): Promise<void>;
    routeChannelMessage(message: Message): Promise<void>;
    routeServerMessage(message: Message): Promise<void>;
    routeDM(message: Message): Promise<void>;
    validateChannelPermission(userId: string, channelId: string): Promise<boolean>;
}
export declare const messageRouter: MessageRouter;
export {};
//# sourceMappingURL=message.router.d.ts.map