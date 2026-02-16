import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { wsServer } from './websocket.server';
export var RoomType;
(function (RoomType) {
    RoomType["CHANNEL"] = "channel";
    RoomType["SERVER"] = "server";
    RoomType["DM"] = "dm";
})(RoomType || (RoomType = {}));
class RoomManager {
    ROOM_TTL = 3600;
    getRoomName(type, id) {
        return `${type}:${id}`;
    }
    async joinRoom(socket, roomType, roomId) {
        try {
            const roomName = this.getRoomName(roomType, roomId);
            const userId = socket.data.user?.id;
            if (!userId) {
                throw new Error('User not authenticated');
            }
            await socket.join(roomName);
            await this.addRoomMember(roomName, userId);
            logger.info({ socketId: socket.id, userId, roomName, roomType, roomId }, 'User joined room');
        }
        catch (error) {
            logger.error({ error, socketId: socket.id, roomType, roomId }, 'Error joining room');
            throw error;
        }
    }
    async leaveRoom(socket, roomType, roomId) {
        try {
            const roomName = this.getRoomName(roomType, roomId);
            const userId = socket.data.user?.id;
            if (!userId) {
                throw new Error('User not authenticated');
            }
            await socket.leave(roomName);
            await this.removeRoomMember(roomName, userId);
            logger.info({ socketId: socket.id, userId, roomName, roomType, roomId }, 'User left room');
        }
        catch (error) {
            logger.error({ error, socketId: socket.id, roomType, roomId }, 'Error leaving room');
            throw error;
        }
    }
    async getRoomMembers(roomName) {
        try {
            const redis = await getRedisClient();
            const key = `room:${roomName}`;
            const members = await redis.sMembers(key);
            return new Set(members);
        }
        catch (error) {
            logger.error({ error, roomName }, 'Error getting room members');
            return new Set();
        }
    }
    async getUserRooms(userId) {
        try {
            const redis = await getRedisClient();
            const pattern = `room:*`;
            const keys = await redis.keys(pattern);
            const userRooms = [];
            for (const key of keys) {
                const isMember = await redis.sIsMember(key, userId);
                if (isMember) {
                    userRooms.push(key.substring(5));
                }
            }
            return userRooms;
        }
        catch (error) {
            logger.error({ error, userId }, 'Error getting user rooms');
            return [];
        }
    }
    broadcastToRoom(roomName, event, data) {
        try {
            const io = wsServer.getIO();
            io.to(roomName).emit(event, data);
            logger.debug({ roomName, event }, 'Broadcast to room');
        }
        catch (error) {
            logger.error({ error, roomName, event }, 'Error broadcasting to room');
        }
    }
    async addRoomMember(roomName, userId) {
        try {
            const redis = await getRedisClient();
            const key = `room:${roomName}`;
            await redis.sAdd(key, userId);
            await redis.expire(key, this.ROOM_TTL);
        }
        catch (error) {
            logger.error({ error, roomName, userId }, 'Error adding room member to Redis');
        }
    }
    async removeRoomMember(roomName, userId) {
        try {
            const redis = await getRedisClient();
            const key = `room:${roomName}`;
            await redis.sRem(key, userId);
            const memberCount = await redis.sCard(key);
            if (memberCount === 0) {
                await redis.del(key);
            }
        }
        catch (error) {
            logger.error({ error, roomName, userId }, 'Error removing room member from Redis');
        }
    }
}
export const roomManager = new RoomManager();
//# sourceMappingURL=room.manager.js.map