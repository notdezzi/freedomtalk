import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { roomManager, RoomType } from './room.manager';
import { wsServer } from './websocket.server';
class TypingManager {
    TYPING_TTL = 5;
    DEBOUNCE_INTERVAL = 3000;
    typingTimeouts = new Map();
    lastTypingTime = new Map();
    async startTyping(userId, channelId, channelType = 'channel') {
        try {
            const key = `${userId}:${channelType}:${channelId}`;
            const now = Date.now();
            const lastTime = this.lastTypingTime.get(key);
            if (lastTime && now - lastTime < this.DEBOUNCE_INTERVAL) {
                logger.debug({ userId, channelId, channelType }, 'Typing event debounced');
                return;
            }
            this.lastTypingTime.set(key, now);
            const redis = await getRedisClient();
            const redisKey = `typing:${channelType}:${channelId}`;
            await redis.sAdd(redisKey, userId);
            await redis.expire(redisKey, this.TYPING_TTL);
            this.broadcastTypingStart(userId, channelId, channelType);
            this.setupTimeout(userId, channelId, channelType);
            logger.debug({ userId, channelId, channelType }, 'User started typing');
        }
        catch (error) {
            logger.error({ error, userId, channelId, channelType }, 'Error starting typing indicator');
        }
    }
    async stopTyping(userId, channelId, channelType = 'channel') {
        try {
            const redis = await getRedisClient();
            const redisKey = `typing:${channelType}:${channelId}`;
            await redis.sRem(redisKey, userId);
            this.broadcastTypingStop(userId, channelId, channelType);
            const key = `${userId}:${channelType}:${channelId}`;
            const timeout = this.typingTimeouts.get(key);
            if (timeout) {
                clearTimeout(timeout);
                this.typingTimeouts.delete(key);
            }
            logger.debug({ userId, channelId, channelType }, 'User stopped typing');
        }
        catch (error) {
            logger.error({ error, userId, channelId, channelType }, 'Error stopping typing indicator');
        }
    }
    async getTypingUsers(channelId, channelType = 'channel') {
        try {
            const redis = await getRedisClient();
            const key = `typing:${channelType}:${channelId}`;
            const userIds = await redis.sMembers(key);
            return new Set(userIds);
        }
        catch (error) {
            logger.error({ error, channelId, channelType }, 'Error getting typing users');
            return new Set();
        }
    }
    setupTimeout(userId, channelId, channelType) {
        const key = `${userId}:${channelType}:${channelId}`;
        const existingTimeout = this.typingTimeouts.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        const timeout = setTimeout(() => {
            this.stopTyping(userId, channelId, channelType);
            this.typingTimeouts.delete(key);
        }, this.TYPING_TTL * 1000);
        this.typingTimeouts.set(key, timeout);
    }
    broadcastTypingStart(userId, channelId, channelType) {
        try {
            const io = wsServer.getIO();
            const timestamp = new Date().toISOString();
            if (channelType === 'dm') {
                const roomName = `dm:${channelId}`;
                io.to(roomName).emit(WS_EVENTS.TYPING_START, {
                    userId,
                    dmChannelId: channelId,
                    timestamp,
                });
            }
            else {
                const roomName = roomManager.getRoomName(RoomType.CHANNEL, channelId);
                roomManager.broadcastToRoom(roomName, WS_EVENTS.TYPING_START, {
                    userId,
                    channelId,
                    timestamp,
                });
            }
        }
        catch (error) {
            logger.error({ error, userId, channelId, channelType }, 'Error broadcasting typing start');
        }
    }
    broadcastTypingStop(userId, channelId, channelType) {
        try {
            const io = wsServer.getIO();
            const timestamp = new Date().toISOString();
            if (channelType === 'dm') {
                const roomName = `dm:${channelId}`;
                io.to(roomName).emit(WS_EVENTS.TYPING_STOP, {
                    userId,
                    dmChannelId: channelId,
                    timestamp,
                });
            }
            else {
                const roomName = roomManager.getRoomName(RoomType.CHANNEL, channelId);
                roomManager.broadcastToRoom(roomName, WS_EVENTS.TYPING_STOP, {
                    userId,
                    channelId,
                    timestamp,
                });
            }
        }
        catch (error) {
            logger.error({ error, userId, channelId, channelType }, 'Error broadcasting typing stop');
        }
    }
}
export const typingManager = new TypingManager();
//# sourceMappingURL=typing.manager.js.map