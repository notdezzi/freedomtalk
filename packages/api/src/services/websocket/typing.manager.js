import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { roomManager, RoomType } from './room.manager';
class TypingManager {
    TYPING_TTL = 5;
    DEBOUNCE_INTERVAL = 3000;
    typingTimeouts = new Map();
    lastTypingTime = new Map();
    async startTyping(userId, channelId) {
        try {
            const key = `${userId}:${channelId}`;
            const now = Date.now();
            const lastTime = this.lastTypingTime.get(key);
            if (lastTime && now - lastTime < this.DEBOUNCE_INTERVAL) {
                logger.debug({ userId, channelId }, 'Typing event debounced');
                return;
            }
            this.lastTypingTime.set(key, now);
            const redis = await getRedisClient();
            const redisKey = `typing:${channelId}`;
            await redis.sAdd(redisKey, userId);
            await redis.expire(redisKey, this.TYPING_TTL);
            this.broadcastTypingStart(userId, channelId);
            this.setupTimeout(userId, channelId);
            logger.debug({ userId, channelId }, 'User started typing');
        }
        catch (error) {
            logger.error({ error, userId, channelId }, 'Error starting typing indicator');
        }
    }
    async stopTyping(userId, channelId) {
        try {
            const redis = await getRedisClient();
            const redisKey = `typing:${channelId}`;
            await redis.sRem(redisKey, userId);
            this.broadcastTypingStop(userId, channelId);
            const key = `${userId}:${channelId}`;
            const timeout = this.typingTimeouts.get(key);
            if (timeout) {
                clearTimeout(timeout);
                this.typingTimeouts.delete(key);
            }
            logger.debug({ userId, channelId }, 'User stopped typing');
        }
        catch (error) {
            logger.error({ error, userId, channelId }, 'Error stopping typing indicator');
        }
    }
    async getTypingUsers(channelId) {
        try {
            const redis = await getRedisClient();
            const key = `typing:${channelId}`;
            const userIds = await redis.sMembers(key);
            return new Set(userIds);
        }
        catch (error) {
            logger.error({ error, channelId }, 'Error getting typing users');
            return new Set();
        }
    }
    setupTimeout(userId, channelId) {
        const key = `${userId}:${channelId}`;
        const existingTimeout = this.typingTimeouts.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        const timeout = setTimeout(() => {
            this.stopTyping(userId, channelId);
            this.typingTimeouts.delete(key);
        }, this.TYPING_TTL * 1000);
        this.typingTimeouts.set(key, timeout);
    }
    broadcastTypingStart(userId, channelId) {
        try {
            const roomName = roomManager.getRoomName(RoomType.CHANNEL, channelId);
            roomManager.broadcastToRoom(roomName, WS_EVENTS.TYPING_START, {
                userId,
                channelId,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger.error({ error, userId, channelId }, 'Error broadcasting typing start');
        }
    }
    broadcastTypingStop(userId, channelId) {
        try {
            const roomName = roomManager.getRoomName(RoomType.CHANNEL, channelId);
            roomManager.broadcastToRoom(roomName, WS_EVENTS.TYPING_STOP, {
                userId,
                channelId,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger.error({ error, userId, channelId }, 'Error broadcasting typing stop');
        }
    }
}
export const typingManager = new TypingManager();
//# sourceMappingURL=typing.manager.js.map