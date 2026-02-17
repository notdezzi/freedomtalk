export interface User {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
    banner: string | null;
    bio: string | null;
    status: "online" | "idle" | "dnd" | "offline";
    customStatus?: string;
    createdAt: string;
}
export interface LoginCredentials {
    email: string;
    password: string;
}
export interface RegisterCredentials {
    username: string;
    email: string;
    password: string;
}
export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}
export interface OAuthProvider {
    name: "google" | "github";
    url: string;
    icon: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}
export interface Server {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    banner: string | null;
    ownerId: string;
    memberCount: number;
    createdAt: string;
}
export interface Channel {
    id: string;
    serverId: string;
    categoryId: string | null;
    name: string;
    type: "text" | "voice" | "announcement";
    topic: string | null;
    position: number;
    nsfw: boolean;
    rateLimitPerUser: number;
}
export interface Category {
    id: string;
    serverId: string;
    name: string;
    position: number;
    channels: Channel[];
}
export interface Message {
    id: string;
    channelId: string;
    serverId?: string;
    dmChannelId?: string;
    authorId: string;
    author: User;
    content: string;
    editedTimestamp: string | null;
    pinned: boolean;
    mentionsEveryone: boolean;
    mentionRoles: string[];
    mentionUsers: string[];
    attachments: Attachment[];
    embeds: Embed[];
    reactions: Reaction[];
    createdAt: string;
}
export interface Attachment {
    id: string;
    filename: string;
    url: string;
    proxyUrl: string;
    size: number;
    mimeType: string;
    width: number | null;
    height: number | null;
}
export interface Embed {
    type: string;
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    image?: {
        url: string;
        width: number;
        height: number;
    };
    thumbnail?: {
        url: string;
        width: number;
        height: number;
    };
    provider?: {
        name: string;
        url?: string;
    };
}
export interface Reaction {
    emoji: string;
    emojiId: string | null;
    count: number;
    me: boolean;
}
export interface DMChannel {
    id: string;
    type: "dm" | "group_dm";
    name: string | null;
    icon: string | null;
    ownerId: string | null;
    recipients: User[];
    lastMessageId: string | null;
    createdAt: string;
}
export interface Role {
    id: string;
    serverId: string;
    name: string;
    color: number;
    icon: string | null;
    position: number;
    permissions: string;
    mentionable: boolean;
    hoist: boolean;
}
export interface Member {
    userId: string;
    serverId: string;
    user: User;
    roles: Role[];
    nickname: string | null;
    joinedAt: string;
}
export interface Invite {
    code: string;
    serverId: string;
    channelId: string;
    inviterId: string;
    inviter: User;
    uses: number;
    maxUses: number;
    expiresAt: string | null;
    createdAt: string;
}
export interface VoiceState {
    userId: string;
    channelId: string;
    serverId: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    selfVideo: boolean;
    sessionId: string;
    streaming: boolean;
}
//# sourceMappingURL=index.d.ts.map