import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { PERMISSION_FLAGS, Permissions } from '@freedomtalk/shared';
import { roleService } from '../server/role.service';
import { serverService } from '../server/server.service';
class PermissionService {
    async getChannelOverwrites(channelId) {
        const overwrites = await db('permission_overwrites')
            .where('channel_id', channelId);
        return overwrites;
    }
    async getOverwrite(channelId, targetId) {
        const overwrite = await db('permission_overwrites')
            .where('channel_id', channelId)
            .where('target_id', targetId)
            .first();
        return overwrite || null;
    }
    async setOverwrite(input) {
        const existing = await this.getOverwrite(input.channelId, input.targetId);
        if (existing) {
            const [updated] = await db('permission_overwrites')
                .where('channel_id', input.channelId)
                .where('target_id', input.targetId)
                .update({
                allow: (input.allow || 0n).toString(),
                deny: (input.deny || 0n).toString(),
                updated_at: new Date(),
            })
                .returning('*');
            return updated;
        }
        const overwriteId = generateSnowflakeId();
        const [overwrite] = await db('permission_overwrites')
            .insert({
            id: overwriteId,
            channel_id: input.channelId,
            target_id: input.targetId,
            target_type: input.targetType,
            allow: (input.allow || 0n).toString(),
            deny: (input.deny || 0n).toString(),
        })
            .returning('*');
        return overwrite;
    }
    async updateOverwrite(channelId, targetId, input) {
        const existing = await this.getOverwrite(channelId, targetId);
        if (!existing) {
            throw new AppError(404, 'OVERWRITE_NOT_FOUND', 'Permission overwrite not found');
        }
        const updateData = {
            updated_at: new Date(),
        };
        if (input.allow !== undefined) {
            updateData.allow = input.allow.toString();
        }
        if (input.deny !== undefined) {
            updateData.deny = input.deny.toString();
        }
        const [updated] = await db('permission_overwrites')
            .where('channel_id', channelId)
            .where('target_id', targetId)
            .update(updateData)
            .returning('*');
        return updated;
    }
    async deleteOverwrite(channelId, targetId) {
        await db('permission_overwrites')
            .where('channel_id', channelId)
            .where('target_id', targetId)
            .delete();
    }
    async calculateChannelPermissions(serverId, channelId, userId) {
        const isOwner = await serverService.isOwner(serverId, userId);
        if (isOwner) {
            const { ALL_PERMISSIONS } = await import('@freedomtalk/shared');
            return ALL_PERMISSIONS;
        }
        let permissions = await roleService.calculateMemberPermissions(serverId, userId);
        if (Permissions.has(permissions, PERMISSION_FLAGS.ADMINISTRATOR)) {
            return permissions;
        }
        const overwrites = await this.getChannelOverwrites(channelId);
        const memberRoles = await db('member_roles')
            .where('server_id', serverId)
            .where('user_id', userId)
            .pluck('role_id');
        const everyoneOverwrite = overwrites.find(o => o.target_id === serverId);
        if (everyoneOverwrite) {
            permissions &= ~BigInt(everyoneOverwrite.deny);
            permissions |= BigInt(everyoneOverwrite.allow);
        }
        let allowRoles = 0n;
        let denyRoles = 0n;
        for (const overwrite of overwrites) {
            if (overwrite.target_type === 'role' && memberRoles.includes(overwrite.target_id)) {
                allowRoles |= BigInt(overwrite.allow);
                denyRoles |= BigInt(overwrite.deny);
            }
        }
        permissions &= ~denyRoles;
        permissions |= allowRoles;
        const memberOverwrite = overwrites.find(o => o.target_type === 'member' && o.target_id === userId);
        if (memberOverwrite) {
            permissions &= ~BigInt(memberOverwrite.deny);
            permissions |= BigInt(memberOverwrite.allow);
        }
        return permissions;
    }
    async hasChannelPermission(serverId, channelId, userId, permission) {
        const permissions = await this.calculateChannelPermissions(serverId, channelId, userId);
        return Permissions.has(permissions, permission);
    }
    async hasServerPermission(serverId, userId, permission) {
        const permissions = await roleService.calculateMemberPermissions(serverId, userId);
        return Permissions.has(permissions, permission);
    }
    async getPermissionBreakdown(serverId, channelId, userId) {
        const basePermissions = await roleService.calculateMemberPermissions(serverId, userId);
        const finalPermissions = await this.calculateChannelPermissions(serverId, channelId, userId);
        const overwrites = await this.getChannelOverwrites(channelId);
        const memberRoles = await db('member_roles')
            .where('server_id', serverId)
            .where('user_id', userId)
            .pluck('role_id');
        const overwritesBreakdown = [];
        for (const overwrite of overwrites) {
            const isRelevant = overwrite.target_type === 'member' ? overwrite.target_id === userId :
                overwrite.target_id === serverId ? true :
                    memberRoles.includes(overwrite.target_id);
            if (isRelevant) {
                let targetName = overwrite.target_id;
                if (overwrite.target_id === serverId) {
                    targetName = '@everyone';
                }
                else if (overwrite.target_type === 'role') {
                    const role = await db('roles').where('id', overwrite.target_id).first();
                    targetName = role?.name || overwrite.target_id;
                }
                else {
                    const user = await db('users').where('id', overwrite.target_id).first();
                    targetName = user?.username || overwrite.target_id;
                }
                overwritesBreakdown.push({
                    type: overwrite.target_type,
                    target: targetName,
                    allow: Permissions.toArray(BigInt(overwrite.allow)),
                    deny: Permissions.toArray(BigInt(overwrite.deny)),
                });
            }
        }
        return {
            base: Permissions.toArray(basePermissions),
            overwrites: overwritesBreakdown,
            final: Permissions.toArray(finalPermissions),
        };
    }
    async syncCategoryPermissions(categoryId) {
        const { db } = await import('../../config/database');
        const category = await db('channel_categories').where('id', categoryId).first();
        if (!category)
            return;
        void await db('channels')
            .where('category_id', categoryId)
            .pluck('id');
    }
}
export const permissionService = new PermissionService();
//# sourceMappingURL=permission.service.js.map