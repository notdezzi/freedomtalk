export interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Message {
    id: string;
    content: string;
    authorId: string;
    channelId: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Channel {
    id: string;
    name: string;
    serverId: string;
    type: 'text' | 'voice';
    createdAt: Date;
    updatedAt: Date;
}
export interface Server {
    id: string;
    name: string;
    ownerId: string;
    icon?: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=index.d.ts.map