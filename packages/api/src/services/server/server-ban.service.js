import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
class ServerBanService {
    async createBan(input) {
        const server = await db('servers').where('id', input.serverId).first();
        if (!server) {
            throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
        }
        if (server.owner_id === input.userId) {
            throw new AppError(400, 'CANNOT_BAN_OWNER', 'Cannot ban the server owner');
        }
        const user = await db('users').where('id', input.userId).first();
        if (!user) {
            throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
        }
        const existingBan = await db('server_bans')
            .where('server_id', input.serverId)
            .where('user_id', input.userId)
            .first();
        if (existingBan) {
            throw new AppError(400, 'ALREADY_BANNED', 'User is already banned from this server');
        }
        const banId = generateSnowflakeId();
        await db.transaction(async (trx) => {
            await trx('server_bans')
                .insert({
                id: banId,
                server_id: input.serverId,
                user_id: input.userId,
                reason: input.reason || null,
                banned_by: input.bannedBy,
            });
            const deleted = await trx('server_members')
                .where('server_id', input.serverId)
                .where('user_id', input.userId)
                .delete();
            if (deleted) {
                await trx('servers')
                    .where('id', input.serverId)
                    .decrement('member_count', 1);
            }
        });
        return this.getBan(input.serverId, input.userId);
    }
    async removeBan(serverId, userId) {
        const ban = await db('server_bans')
            .where('server_id', serverId)
            .where('user_id', userId)
            .first();
        if (!ban) {
            throw new AppError(404, 'BAN_NOT_FOUND', 'Ban not found');
        }
        await db('server_bans')
            .where('server_id', serverId)
            .where('user_id', userId)
            .delete();
    }
    async getBan(serverId, userId) {
        const ban = await db('server_bans')
            .where('server_id', serverId)
            .where('user_id', userId)
            .first();
        if (!ban)
            return null;
        const user = await db('users')
            .where('id', userId)
            .select('id', 'username', 'avatar')
            .first();
        return {
            ...ban,
            user: user || undefined,
        };
    }
    async getBans(serverId, options) {
        const limit = options?.limit || 100;
        const offset = options?.offset || 0;
        const countResult = await db('server_bans')
            .where('server_id', serverId)
            .count('id as count')
            .first();
        const total = parseInt(String(countResult?.count || 0), 10);
        const bans = await db('server_bans')
            .where('server_id', serverId)
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);
        const userIds = bans.map(b => b.user_id);
        const users = await db('users')
            .whereIn('id', userIds)
            .select('id', 'username', 'avatar');
        const userMap = new Map(users.map(u => [u.id, u]));
        const formattedBans = bans.map(ban => ({
            ...ban,
            user: userMap.get(ban.user_id) ? {
                id: ban.user_id,
                username: userMap.get(ban.user_id).username,
                avatar: userMap.get(ban.user_id).avatar,
            } : undefined,
        }));
        return { bans: formattedBans, total };
    }
    async isBanned(serverId, userId) {
        const ban = await db('server_bans')
            .where('server_id', serverId)
            .where('user_id', userId)
            .first();
        return !!ban;
    }
}
export const serverBanService = new ServerBanService();
//# sourceMappingURL=server-ban.service.js.map