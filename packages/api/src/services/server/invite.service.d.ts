export interface InviteWithDetails {
    id: string;
    server_id: string;
    channel_id: string;
    inviter_id: string;
    code: string;
    max_uses: number | null;
    uses: number;
    max_age: number | null;
    temporary: boolean;
    created_at: Date;
    expires_at: Date | null;
    server?: {
        id: string;
        name: string;
        icon_url: string | null;
        member_count: number;
    };
    channel?: {
        id: string;
        name: string;
        type: string;
    };
    inviter?: {
        id: string;
        username: string;
        avatar: string | null;
    };
}
export interface CreateInviteInput {
    serverId: string;
    channelId: string;
    inviterId: string;
    maxUses?: number;
    maxAge?: number;
    temporary?: boolean;
}
declare class InviteService {
    private generateCode;
    createInvite(input: CreateInviteInput): Promise<InviteWithDetails>;
    getInviteByCode(code: string): Promise<InviteWithDetails | null>;
    getInvite(inviteId: string): Promise<InviteWithDetails | null>;
    getServerInvites(serverId: string): Promise<InviteWithDetails[]>;
    getChannelInvites(channelId: string): Promise<InviteWithDetails[]>;
    deleteInvite(code: string, userId: string): Promise<void>;
    useInvite(code: string, _userId: string): Promise<InviteWithDetails>;
    private codeExists;
    cleanupExpiredInvites(): Promise<number>;
}
export declare const inviteService: InviteService;
export {};
//# sourceMappingURL=invite.service.d.ts.map