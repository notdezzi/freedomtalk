import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { wsServer } from './websocket.server';
class PresenceManager {
    PRESENCE_TTL = 60;
    async setOnline(userId) {
        try {
            const redis = await getRedisClient();
            const key = `presence:${userId}`;
            await redis.set(key, 'online', { EX: this.PRESENCE_TTL });
            this.broadcastPresenceUpdate(userId, 'online');
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
            this.broadcastPresenceUpdate(userId, 'offline');
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
    broadcastPresenceUpdate(userId, presence) {
        try {
            const io = wsServer.getIO();
            io.emit(WS_EVENTS.PRESENCE_UPDATE, {
                userId,
                presence,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger.error({ error, userId, presence }, 'Error broadcasting presence update');
        }
    }
}
export const presenceManager = new PresenceManager();
//# sourceMappingURL=presence.manager.js.map