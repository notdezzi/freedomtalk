export interface ServerBanWithUser {
    id: string;
    server_id: string;
    user_id: string;
    reason: string | null;
    banned_by: string;
    created_at: Date;
    user?: {
        id: string;
        username: string;
        avatar: string | null;
    };
}
export interface CreateBanInput {
    serverId: string;
    userId: string;
    reason?: string;
    bannedBy: string;
    deleteMessageDays?: number;
}
declare class ServerBanService {
    createBan(input: CreateBanInput): Promise<ServerBanWithUser>;
    removeBan(serverId: string, userId: string): Promise<void>;
    getBan(serverId: string, userId: string): Promise<ServerBanWithUser | null>;
    getBans(serverId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        bans: ServerBanWithUser[];
        total: number;
    }>;
    isBanned(serverId: string, userId: string): Promise<boolean>;
}
export declare const serverBanService: ServerBanService;
export {};
//# sourceMappingURL=server-ban.service.d.ts.map