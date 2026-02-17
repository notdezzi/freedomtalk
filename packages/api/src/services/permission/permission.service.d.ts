import { PermissionOverwriteType } from '@freedomtalk/shared';
export interface PermissionOverwriteData {
    id: string;
    channel_id: string;
    target_id: string;
    target_type: PermissionOverwriteType;
    allow: string;
    deny: string;
    created_at: Date;
    updated_at: Date;
}
export interface CreateOverwriteInput {
    channelId: string;
    targetId: string;
    targetType: PermissionOverwriteType;
    allow?: bigint;
    deny?: bigint;
}
export interface UpdateOverwriteInput {
    allow?: bigint;
    deny?: bigint;
}
declare class PermissionService {
    getChannelOverwrites(channelId: string): Promise<PermissionOverwriteData[]>;
    getOverwrite(channelId: string, targetId: string): Promise<PermissionOverwriteData | null>;
    setOverwrite(input: CreateOverwriteInput): Promise<PermissionOverwriteData>;
    updateOverwrite(channelId: string, targetId: string, input: UpdateOverwriteInput): Promise<PermissionOverwriteData>;
    deleteOverwrite(channelId: string, targetId: string): Promise<void>;
    calculateChannelPermissions(serverId: string, channelId: string, userId: string): Promise<bigint>;
    hasChannelPermission(serverId: string, channelId: string, userId: string, permission: bigint): Promise<boolean>;
    hasServerPermission(serverId: string, userId: string, permission: bigint): Promise<boolean>;
    getPermissionBreakdown(serverId: string, channelId: string, userId: string): Promise<{
        base: string[];
        overwrites: Array<{
            type: string;
            target: string;
            allow: string[];
            deny: string[];
        }>;
        final: string[];
    }>;
    syncCategoryPermissions(categoryId: string): Promise<void>;
}
export declare const permissionService: PermissionService;
export {};
//# sourceMappingURL=permission.service.d.ts.map