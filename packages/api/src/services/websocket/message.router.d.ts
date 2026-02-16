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