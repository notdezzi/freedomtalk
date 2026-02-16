import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { wsServer } from './websocket.server';
import { dmChannelService } from '../dm/dm-channel.service';
class PresenceManager {
    PRESENCE_TTL = 60;
    DM_PARTICIPANTS_CACHE_TTL = 300;
    async setOnline(userId) {
        try {
            const redis = await getRedisClient();
            const key = `presence:${userId}`;
            await redis.set(key, 'online', { EX: this.PRESENCE_TTL });
            await this.broadcastPresenceUpdate(userId, 'online');
            logger.debug({ userId }, 'User set to online');
        }
        catch (error) {
            logger.error({ error, userId }, 'Error setting user online');
        }
    }
    async setOffline(userId) {
        try {
            const redis = await getRedisClient();
            const key = `presence:${userId}`;
            await redis.del(key);
            await this.broadcastPresenceUpdate(userId, 'offline');
            logger.debug({ userId }, 'User set to offline');
        }
        catch (error) {
            logger.error({ error, userId }, 'Error setting user offline');
        }
    }
    async getPresence(userId) {
        try {
            const redis = await getRedisClient();
            const key = `presence:${userId}`;
            const presence = await redis.get(key);
            return presence === 'online' ? 'online' : 'offline';
        }
        catch (error) {
            logger.error({ error, userId }, 'Error getting user presence');
            return 'offline';
        }
    }
    async refreshPresence(userId) {
        try {
            const redis = await getRedisClient();
            const key = `presence:${userId}`;
            const exists = await redis.exists(key);
            if (exists) {
                await redis.expire(key, this.PRESENCE_TTL);
                logger.debug({ userId }, 'User presence refreshed');
            }
            else {
                await this.setOnline(userId);
            }
        }
        catch (error) {
            logger.error({ error, userId }, 'Error refreshing user presence');
        }
    }
    async getBulkPresence(userIds) {
        const presenceMap = new Map();
        try {
            const redis = await getRedisClient();
            const keys = userIds.map(id => `presence:${id}`);
            const values = await redis.mGet(keys);
            userIds.forEach((userId, index) => {
                const presence = values[index] === 'online' ? 'online' : 'offline';
                presenceMap.set(userId, presence);
            });
        }
        catch (error) {
            logger.error({ error, userCount: userIds.length }, 'Error getting bulk presence');
            userIds.forEach(userId => presenceMap.set(userId, 'offline'));
        }
        return presenceMap;
    }
    async subscribeToDMPresence(userId, dmChannelId) {
        try {
            const redis = await getRedisClient();
            const key = `dm:presence_sub:${userId}:${dmChannelId}`;
            await redis.set(key, '1', { EX: this.DM_PARTICIPANTS_CACHE_TTL });
            logger.debug({ userId, dmChannelId }, 'Subscribed to DM presence');
        }
        catch (error) {
            logger.error({ error, userId, dmChannelId }, 'Error subscribing to DM presence');
        }
    }
    async unsubscribeFromDMPresence(userId, dmChannelId) {
        try {
            const redis = await getRedisClient();
            const key = `dm:presence_sub:${userId}:${dmChannelId}`;
            await redis.del(key);
            logger.debug({ userId, dmChannelId }, 'Unsubscribed from DM presence');
        }
        catch (error) {
            logger.error({ error, userId, dmChannelId }, 'Error unsubscribing from DM presence');
        }
    }
    async getDMParticipantPresence(dmChannelId) {
        try {
            const participantIds = await this.getCachedDMParticipants(dmChannelId);
            if (participantIds.length === 0) {
                return new Map();
            }
            return this.getBulkPresence(participantIds);
        }
        catch (error) {
            logger.error({ error, dmChannelId }, 'Error getting DM participant presence');
            return new Map();
        }
    }
    async getCachedDMParticipants(dmChannelId) {
        try {
            const redis = await getRedisClient();
            const cacheKey = `dm:participants:${dmChannelId}`;
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
            const participantIds = await dmChannelService.getParticipantUserIds(dmChannelId);
            await redis.set(cacheKey, JSON.stringify(participantIds), { EX: this.DM_PARTICIPANTS_CACHE_TTL });
            return participantIds;
        }
        catch (error) {
            logger.error({ error, dmChannelId }, 'Error getting cached DM participants');
            return [];
        }
    }
    async invalidateDMParticipantsCache(dmChannelId) {
        try {
            const redis = await getRedisClient();
            const cacheKey = `dm:participants:${dmChannelId}`;
            await redis.del(cacheKey);
            logger.debug({ dmChannelId }, 'DM participants cache invalidated');
        }
        catch (error) {
            logger.error({ error, dmChannelId }, 'Error invalidating DM participants cache');
        }
    }
    async broadcastPresenceUpdate(userId, presence) {
        try {
            const io = wsServer.getIO();
            const timestamp = new Date().toISOString();
            io.emit(WS_EVENTS.PRESENCE_UPDATE, {
                userId,
                presence,
                timestamp,
            });
            const result = await dmChannelService.getDMsByUser(userId, 100, 0);
            for (const dmChannel of result.dmChannels) {
                const roomName = `dm:${dmChannel.id}`;
                io.to(roomName).emit(WS_EVENTS.PRESENCE_UPDATE, {
                    userId,
                    presence,
                    dmChannelId: dmChannel.id,
                    timestamp,
                });
            }
            logger.debug({ userId, presence, dmCount: result.dmChannels.length }, 'Presence update broadcast');
        }
        catch (error) {
            logger.error({ error, userId, presence }, 'Error broadcasting presence update');
        }
    }
}
export const presenceManager = new PresenceManager();
//# sourceMappingURL=presence.manager.js.map