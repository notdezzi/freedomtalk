import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { VALIDATION } from '@freedomtalk/shared';
class ServerMemberService {
    async addMember(input) {
        const server = await db('servers').where('id', input.serverId).first();
        if (!server) {
            throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
        }
        const existingMember = await db('server_members')
            .where('server_id', input.serverId)
            .where('user_id', input.userId)
            .first();
        if (existingMember) {
            throw new AppError(400, 'ALREADY_A_MEMBER', 'User is already a member of this server');
        }
        const ban = await db('server_bans')
            .where('server_id', input.serverId)
            .where('user_id', input.userId)
            .first();
        if (ban) {
            throw new AppError(403, 'USER_BANNED', 'User is banned from this server');
        }
        if (server.member_count >= server.max_members) {
            throw new AppError(403, 'SERVER_FULL', 'Server has reached maximum member limit');
        }
        const memberId = generateSnowflakeId();
        const [member] = await db('server_members')
            .insert({
            id: memberId,
            server_id: input.serverId,
            user_id: input.userId,
            nickname: null,
            avatar_url: null,
            mute: false,
            deaf: false,
            pending: input.pending || false,
            joined_at: new Date(),
            boosted_since: null,
            communication_disabled_until: null,
        })
            .returning('*');
        await db('servers')
            .where('id', input.serverId)
            .increment('member_count', 1);
        return member;
    }
    async removeMember(serverId, userId, requesterId) {
        const server = await db('servers').where('id', serverId).first();
        if (!server) {
            throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
        }
        if (server.owner_id === userId) {
            throw new AppError(400, 'CANNOT_REMOVE_OWNER', 'Cannot remove the server owner');
        }
        if (userId !== requesterId) {
            const member = await this.getMember(serverId, userId);
            if (!member) {
                throw new AppError(404, 'MEMBER_NOT_FOUND', 'Member not found');
            }
        }
        const deleted = await db('server_members')
            .where('server_id', serverId)
            .where('user_id', userId)
            .delete();
        if (deleted) {
            await db('servers')
                .where('id', serverId)
                .decrement('member_count', 1);
        }
    }
    async getMember(serverId, userId) {
        const member = await db('server_members')
            .where('server_id', serverId)
            .where('user_id', userId)
            .first();
        if (!member)
            return null;
        const user = await db('users')
            .where('id', userId)
            .select('id', 'username', 'avatar')
            .first();
        const roles = await db('member_roles')
            .where('server_id', serverId)
            .where('user_id', userId)
            .join('roles', 'member_roles.role_id', 'roles.id')
            .select('roles.id', 'roles.name', 'roles.color', 'roles.position')
            .orderBy('roles.position', 'desc');
        return {
            ...member,
            user: user || undefined,
            roles: roles || [],
        };
    }
    async getMembers(serverId, options) {
        const limit = options?.limit || 100;
        const offset = options?.offset || 0;
        let query = db('server_members')
            .where('server_id', serverId)
            .join('users', 'server_members.user_id', 'users.id');
        if (options?.search) {
            query = query.where(function () {
                this.where('users.username', 'ilike', `%${options.search}%`)
                    .orWhere('server_members.nickname', 'ilike', `%${options.search}%`);
            });
        }
        const countQuery = query.clone();
        const countResult = await countQuery.count('server_members.id as count').first();
        const total = parseInt(String(countResult?.count || 0), 10);
        const members = await query
            .select('server_members.*', 'users.id as user_id', 'users.username as user_username', 'users.avatar as user_avatar')
            .orderBy('server_members.joined_at', 'asc')
            .limit(limit)
            .offset(offset);
        const userIds = members.map(m => m.user_id);
        const allRoles = await db('member_roles')
            .whereIn('member_roles.user_id', userIds)
            .where('member_roles.server_id', serverId)
            .join('roles', 'member_roles.role_id', 'roles.id')
            .select('member_roles.user_id', 'roles.id', 'roles.name', 'roles.color', 'roles.position')
            .orderBy('roles.position', 'desc');
        const rolesByUser = {};
        for (const role of allRoles) {
            const userId = role.user_id;
            if (!rolesByUser[userId]) {
                rolesByUser[userId] = [];
            }
            rolesByUser[userId].push(role);
        }
        const formattedMembers = members.map(m => ({
            id: m.id,
            server_id: m.server_id,
            user_id: m.user_id,
            nickname: m.nickname,
            avatar_url: m.avatar_url,
            mute: m.mute,
            deaf: m.deaf,
            pending: m.pending,
            joined_at: m.joined_at,
            boosted_since: m.boosted_since,
            communication_disabled_until: m.communication_disabled_until,
            created_at: m.created_at,
            updated_at: m.updated_at,
            user: {
                id: m.user_id,
                username: m.user_username,
                avatar: m.user_avatar,
            },
            roles: rolesByUser[m.user_id] || [],
        }));
        return { members: formattedMembers, total };
    }
    async updateMember(serverId, userId, input) {
        const member = await this.getMember(serverId, userId);
        if (!member) {
            throw new AppError(404, 'MEMBER_NOT_FOUND', 'Member not found');
        }
        const updateData = {
            updated_at: new Date(),
        };
        if (input.nickname !== undefined) {
            if (input.nickname !== null) {
                if (input.nickname.length < VALIDATION.NICKNAME.MIN_LENGTH ||
                    input.nickname.length > VALIDATION.NICKNAME.MAX_LENGTH) {
                    throw new AppError(400, 'INVALID_NICKNAME', `Nickname must be between ${VALIDATION.NICKNAME.MIN_LENGTH} and ${VALIDATION.NICKNAME.MAX_LENGTH} characters`);
                }
            }
            updateData.nickname = input.nickname;
        }
        if (input.avatarUrl !== undefined)
            updateData.avatar_url = input.avatarUrl;
        if (input.mute !== undefined)
            updateData.mute = input.mute;
        if (input.deaf !== undefined)
            updateData.deaf = input.deaf;
        if (input.communicationDisabledUntil !== undefined) {
            updateData.communication_disabled_until = input.communicationDisabledUntil;
        }
        await db('server_members')
            .where('server_id', serverId)
            .where('user_id', userId)
            .update(updateData);
        return this.getMember(serverId, userId);
    }
    async addRole(serverId, userId, roleId) {
        const role = await db('roles')
            .where('id', roleId)
            .where('server_id', serverId)
            .first();
        if (!role) {
            throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found in this server');
        }
        const existing = await db('member_roles')
            .where('server_id', serverId)
            .where('user_id', userId)
            .where('role_id', roleId)
            .first();
        if (existing) {
            return;
        }
        await db('member_roles').insert({
            server_id: serverId,
            user_id: userId,
            role_id: roleId,
            assigned_at: new Date(),
        });
    }
    async removeRole(serverId, userId, roleId) {
        await db('member_roles')
            .where('server_id', serverId)
            .where('user_id', userId)
            .where('role_id', roleId)
            .delete();
    }
    async setRoles(serverId, userId, roleIds) {
        await db.transaction(async (trx) => {
            await trx('member_roles')
                .where('server_id', serverId)
                .where('user_id', userId)
                .delete();
            if (roleIds.length > 0) {
                const roleInserts = roleIds.map(roleId => ({
                    server_id: serverId,
                    user_id: userId,
                    role_id: roleId,
                    assigned_at: new Date(),
                }));
                await trx('member_roles').insert(roleInserts);
            }
        });
    }
}
export const serverMemberService = new ServerMemberService();
//# sourceMappingURL=server-member.service.js.map