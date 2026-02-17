import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { VALIDATION, DEFAULTS, DEFAULT_PERMISSIONS } from '@freedomtalk/shared';
class ServerService {
    async createServer(input) {
        const serverId = generateSnowflakeId();
        const roleId = generateSnowflakeId();
        const channelId = generateSnowflakeId();
        const result = await db.transaction(async (trx) => {
            const [server] = await trx('servers').insert({
                id: serverId,
                name: input.name,
                description: input.description || null,
                owner_id: input.ownerId,
                icon_url: input.iconUrl || null,
                banner_url: null,
                splash_url: null,
                discovery_splash_url: null,
                default_role_id: roleId,
                system_channel_id: channelId,
                rules_channel_id: null,
                public_updates_channel_id: null,
                afk_channel_id: null,
                afk_timeout: DEFAULTS.SERVER.AFK_TIMEOUT,
                nsfw: false,
                verified: false,
                vanity_url_code: null,
                member_count: 1,
                max_members: DEFAULTS.SERVER.MAX_MEMBERS,
                preferred_locale: DEFAULTS.SERVER.PREFERRED_LOCALE,
            }).returning('*');
            await trx('roles').insert({
                id: roleId,
                server_id: serverId,
                name: '@everyone',
                color: 0,
                hoist: false,
                icon: null,
                position: 0,
                permissions: DEFAULT_PERMISSIONS.toString(),
                managed: false,
                mentionable: false,
            });
            await trx('channels').insert({
                id: channelId,
                server_id: serverId,
                category_id: null,
                name: 'general',
                type: 'text',
                topic: null,
                position: 0,
                nsfw: false,
                rate_limit_per_user: 0,
                parent_id: null,
                last_message_id: null,
                bitrate: null,
                user_limit: null,
                rtc_region: null,
            });
            const memberId = generateSnowflakeId();
            await trx('server_members').insert({
                id: memberId,
                server_id: serverId,
                user_id: input.ownerId,
                nickname: null,
                avatar_url: null,
                mute: false,
                deaf: false,
                pending: false,
                joined_at: new Date(),
                boosted_since: null,
                communication_disabled_until: null,
            });
            return server;
        });
        return result;
    }
    async getServer(serverId) {
        const server = await db('servers')
            .where('id', serverId)
            .first();
        return server || null;
    }
    async updateServer(serverId, input, userId) {
        const server = await this.getServer(serverId);
        if (!server) {
            throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
        }
        if (server.owner_id !== userId) {
            throw new AppError(403, 'FORBIDDEN', 'Only the server owner can update server settings');
        }
        const updateData = {
            updated_at: new Date(),
        };
        if (input.name !== undefined) {
            if (input.name.length < VALIDATION.SERVER_NAME.MIN_LENGTH ||
                input.name.length > VALIDATION.SERVER_NAME.MAX_LENGTH) {
                throw new AppError(400, 'INVALID_NAME', `Server name must be between ${VALIDATION.SERVER_NAME.MIN_LENGTH} and ${VALIDATION.SERVER_NAME.MAX_LENGTH} characters`);
            }
            updateData.name = input.name;
        }
        if (input.description !== undefined) {
            if (input.description && input.description.length > VALIDATION.SERVER_DESCRIPTION.MAX_LENGTH) {
                throw new AppError(400, 'INVALID_DESCRIPTION', `Description must be at most ${VALIDATION.SERVER_DESCRIPTION.MAX_LENGTH} characters`);
            }
            updateData.description = input.description;
        }
        if (input.iconUrl !== undefined)
            updateData.icon_url = input.iconUrl;
        if (input.bannerUrl !== undefined)
            updateData.banner_url = input.bannerUrl;
        if (input.splashUrl !== undefined)
            updateData.splash_url = input.splashUrl;
        if (input.systemChannelId !== undefined)
            updateData.system_channel_id = input.systemChannelId;
        if (input.rulesChannelId !== undefined)
            updateData.rules_channel_id = input.rulesChannelId;
        if (input.publicUpdatesChannelId !== undefined)
            updateData.public_updates_channel_id = input.publicUpdatesChannelId;
        if (input.afkChannelId !== undefined)
            updateData.afk_channel_id = input.afkChannelId;
        if (input.afkTimeout !== undefined)
            updateData.afk_timeout = input.afkTimeout;
        if (input.preferredLocale !== undefined)
            updateData.preferred_locale = input.preferredLocale;
        if (input.nsfw !== undefined)
            updateData.nsfw = input.nsfw;
        if (input.vanityUrlCode !== undefined)
            updateData.vanity_url_code = input.vanityUrlCode;
        const [updated] = await db('servers')
            .where('id', serverId)
            .update(updateData)
            .returning('*');
        return updated;
    }
    async deleteServer(serverId, userId) {
        const server = await this.getServer(serverId);
        if (!server) {
            throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
        }
        if (server.owner_id !== userId) {
            throw new AppError(403, 'FORBIDDEN', 'Only the server owner can delete the server');
        }
        await db('servers').where('id', serverId).delete();
    }
    async getUserServers(userId) {
        const servers = await db('servers')
            .join('server_members', 'servers.id', 'server_members.server_id')
            .where('server_members.user_id', userId)
            .select('servers.*')
            .orderBy('servers.created_at', 'desc');
        return servers;
    }
    async isMember(serverId, userId) {
        const member = await db('server_members')
            .where('server_id', serverId)
            .where('user_id', userId)
            .first();
        return !!member;
    }
    async isOwner(serverId, userId) {
        const server = await db('servers')
            .where('id', serverId)
            .where('owner_id', userId)
            .first();
        return !!server;
    }
    async updateMemberCount(serverId) {
        const count = await db('server_members')
            .where('server_id', serverId)
            .count('id as count')
            .first();
        await db('servers')
            .where('id', serverId)
            .update({
            member_count: count?.count || 0,
            updated_at: new Date(),
        });
    }
    async transferOwnership(serverId, currentOwnerId, newOwnerId) {
        const server = await this.getServer(serverId);
        if (!server) {
            throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
        }
        if (server.owner_id !== currentOwnerId) {
            throw new AppError(403, 'FORBIDDEN', 'Only the server owner can transfer ownership');
        }
        const newOwnerMember = await db('server_members')
            .where('server_id', serverId)
            .where('user_id', newOwnerId)
            .first();
        if (!newOwnerMember) {
            throw new AppError(400, 'NOT_A_MEMBER', 'The new owner must be a member of the server');
        }
        const [updated] = await db('servers')
            .where('id', serverId)
            .update({
            owner_id: newOwnerId,
            updated_at: new Date(),
        })
            .returning('*');
        return updated;
    }
}
export const serverService = new ServerService();
//# sourceMappingURL=server.service.js.map