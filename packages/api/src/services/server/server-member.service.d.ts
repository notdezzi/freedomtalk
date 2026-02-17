export interface ServerMemberWithUser {
    id: string;
    server_id: string;
    user_id: string;
    nickname: string | null;
    avatar_url: string | null;
    mute: boolean;
    deaf: boolean;
    pending: boolean;
    joined_at: Date;
    boosted_since: Date | null;
    communication_disabled_until: string | null;
    created_at: Date;
    updated_at: Date;
    user?: {
        id: string;
        username: string;
        avatar: string | null;
    };
    roles?: Array<{
        id: string;
        name: string;
        color: number;
        position: number;
    }>;
}
export interface UpdateMemberInput {
    nickname?: string | null;
    avatarUrl?: string | null;
    mute?: boolean;
    deaf?: boolean;
    communicationDisabledUntil?: string | null;
}
export interface AddMemberInput {
    serverId: string;
    userId: string;
    pending?: boolean;
}
declare class ServerMemberService {
    addMember(input: AddMemberInput): Promise<ServerMemberWithUser>;
    removeMember(serverId: string, userId: string, requesterId: string): Promise<void>;
    getMember(serverId: string, userId: string): Promise<ServerMemberWithUser | null>;
    getMembers(serverId: string, options?: {
        limit?: number;
        offset?: number;
        search?: string;
    }): Promise<{
        members: ServerMemberWithUser[];
        total: number;
    }>;
    updateMember(serverId: string, userId: string, input: UpdateMemberInput): Promise<ServerMemberWithUser>;
    addRole(serverId: string, userId: string, roleId: string): Promise<void>;
    removeRole(serverId: string, userId: string, roleId: string): Promise<void>;
    setRoles(serverId: string, userId: string, roleIds: string[]): Promise<void>;
}
export declare const serverMemberService: ServerMemberService;
export {};
//# sourceMappingURL=server-member.service.d.ts.map