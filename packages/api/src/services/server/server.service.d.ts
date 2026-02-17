export interface CreateServerInput {
    name: string;
    description?: string;
    iconUrl?: string;
    ownerId: string;
}
export interface UpdateServerInput {
    name?: string;
    description?: string | null;
    iconUrl?: string | null;
    bannerUrl?: string | null;
    splashUrl?: string | null;
    systemChannelId?: string | null;
    rulesChannelId?: string | null;
    publicUpdatesChannelId?: string | null;
    afkChannelId?: string | null;
    afkTimeout?: number;
    preferredLocale?: string;
    nsfw?: boolean;
    vanityUrlCode?: string | null;
}
export interface ServerWithMembers {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    icon_url: string | null;
    banner_url: string | null;
    splash_url: string | null;
    discovery_splash_url: string | null;
    default_role_id: string | null;
    system_channel_id: string | null;
    rules_channel_id: string | null;
    public_updates_channel_id: string | null;
    afk_channel_id: string | null;
    afk_timeout: number;
    nsfw: boolean;
    verified: boolean;
    vanity_url_code: string | null;
    member_count: number;
    max_members: number;
    preferred_locale: string;
    created_at: Date;
    updated_at: Date;
}
declare class ServerService {
    createServer(input: CreateServerInput): Promise<ServerWithMembers>;
    getServer(serverId: string): Promise<ServerWithMembers | null>;
    updateServer(serverId: string, input: UpdateServerInput, userId: string): Promise<ServerWithMembers>;
    deleteServer(serverId: string, userId: string): Promise<void>;
    getUserServers(userId: string): Promise<ServerWithMembers[]>;
    isMember(serverId: string, userId: string): Promise<boolean>;
    isOwner(serverId: string, userId: string): Promise<boolean>;
    updateMemberCount(serverId: string): Promise<void>;
    transferOwnership(serverId: string, currentOwnerId: string, newOwnerId: string): Promise<ServerWithMembers>;
}
export declare const serverService: ServerService;
export {};
//# sourceMappingURL=server.service.d.ts.map