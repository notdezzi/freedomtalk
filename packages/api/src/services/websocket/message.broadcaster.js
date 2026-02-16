import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { wsServer } from './websocket.server';
import { subscriptionManager } from './subscription.manager';
import { connectionManager } from './connection.manager';
import { roomManager, RoomType } from './room.manager';
class MessageBroadcaster {
    DEDUP_TTL = 60;
    async broadcastMessage(message) {
        try {
            if (await this.isDuplicate(message.id)) {
                logger.debug({ messageId: message.id }, 'Message broadcast deduplicated');
                return;
            }
            await this.markBroadcast(message.id);
            if (message.channelId) {
                const subscribers = await subscriptionManager.getChannelSubscribers(message.channelId);
                const roomName = roomManager.getRoomName(RoomType.CHANNEL, message.channelId);
                roomManager.broadcastToRoom(roomName, WS_EVENTS.MESSAGE_CREATED, message);
                logger.info({
                    messageId: message.id,
                    channelId: message.channelId,
                    subscriberCount: subscribers.size
                }, 'Message broadcast to channel');
            }
        }
        catch (error) {
            logger.error({ error, messageId: message.id }, 'Error broadcasting message');
            throw error;
        }
    }
    async broadcastMessageUpdate(message) {
        try {
            if (message.channelId) {
                const roomName = roomManager.getRoomName(RoomType.CHANNEL, message.channelId);
                roomManager.broadcastToRoom(roomName, WS_EVENTS.MESSAGE_UPDATED, message);
                logger.info({ messageId: message.id, channelId: message.channelId }, 'Message update broadcast');
            }
        }
        catch (error) {
            logger.error({ error, messageId: message.id }, 'Error broadcasting message update');
            throw error;
        }
    }
    async broadcastMessageDelete(messageId, channelId) {
        try {
            const roomName = roomManager.getRoomName(RoomType.CHANNEL, channelId);
            roomManager.broadcastToRoom(roomName, WS_EVENTS.MESSAGE_DELETED, {
                id: messageId,
                channelId,
                timestamp: new Date().toISOString(),
            });
            logger.info({ messageId, channelId }, 'Message deletion broadcast');
        }
        catch (error) {
            logger.error({ error, messageId, channelId }, 'Error broadcasting message deletion');
            throw error;
        }
    }
    async broadcastToUser(userId, event, data) {
        try {
            const socketIds = connectionManager.getUserConnections(userId);
            const io = wsServer.getIO();
            for (const socketId of socketIds) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.emit(event, data);
                }
            }
            logger.debug({ userId, event, socketCount: socketIds.length }, 'Broadcast to user');
        }
        catch (error) {
            logger.error({ error, userId, event }, 'Error broadcasting to user');
        }
    }
    async isDuplicate(messageId) {
        try {
            const redis = await getRedisClient();
            const key = `broadcast:${messageId}`;
            const exists = await redis.exists(key);
            return exists > 0;
        }
        catch (error) {
            logger.error({ error, messageId }, 'Error checking broadcast deduplication');
            return false;
        }
    }
    async markBroadcast(messageId) {
        try {
            const redis = await getRedisClient();
            const key = `broadcast:${messageId}`;
            await redis.set(key, '1', { EX: this.DEDUP_TTL });
        }
        catch (error) {
            logger.error({ error, messageId }, 'Error marking message as broadcast');
        }
    }
}
export const messageBroadcaster = new MessageBroadcaster();
//# sourceMappingURL=message.broadcaster.js.map