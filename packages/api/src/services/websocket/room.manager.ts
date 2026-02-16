import { Socket } from 'socket.io';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { wsServer } from './websocket.server';

/**
 * Room type enum
 */
export enum RoomType {
  CHANNEL = 'channel',
  SERVER = 'server',
  DM = 'dm',
}

/**
 * Room Manager class
 * Manages Socket.io rooms for channels, servers, and DMs
 */
class RoomManager {
  private readonly ROOM_TTL = 3600; // 1 hour

  /**
   * Get standardized room name
   * @param type - Room type
   * @param id - Room ID
   * @returns Standardized room name
   */
  getRoomName(type: RoomType, id: string): string {
    return `${type}:${id}`;
  }

  /**
   * Join a room
   * @param socket - Socket instance
   * @param roomType - Room type
   * @param roomId - Room ID
   */
  async joinRoom(socket: Socket, roomType: RoomType, roomId: string): Promise<void> {
    try {
      const roomName = this.getRoomName(roomType, roomId);
      const userId = socket.data.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Join Socket.io room
      await socket.join(roomName);

      // Track membership in Redis
      await this.addRoomMember(roomName, userId);

      logger.info({ socketId: socket.id, userId, roomName, roomType, roomId }, 'User joined room');
    } catch (error) {
      logger.error({ error, socketId: socket.id, roomType, roomId }, 'Error joining room');
      throw error;
    }
  }

  /**
   * Leave a room
   * @param socket - Socket instance
   * @param roomType - Room type
   * @param roomId - Room ID
   */
  async leaveRoom(socket: Socket, roomType: RoomType, roomId: string): Promise<void> {
    try {
      const roomName = this.getRoomName(roomType, roomId);
      const userId = socket.data.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Leave Socket.io room
      await socket.leave(roomName);

      // Remove from Redis
      await this.removeRoomMember(roomName, userId);

      logger.info({ socketId: socket.id, userId, roomName, roomType, roomId }, 'User left room');
    } catch (error) {
      logger.error({ error, socketId: socket.id, roomType, roomId }, 'Error leaving room');
      throw error;
    }
  }

  /**
   * Get all members in a room
   * @param roomName - Room name
   * @returns Set of user IDs
   */
  async getRoomMembers(roomName: string): Promise<Set<string>> {
    try {
      const redis = await getRedisClient();
      const key = `room:${roomName}`;
      const members = await redis.sMembers(key);
      return new Set(members);
    } catch (error) {
      logger.error({ error, roomName }, 'Error getting room members');
      return new Set();
    }
  }

  /**
   * Get all rooms a user is in
   * @param userId - User ID
   * @returns Array of room names
   */
  async getUserRooms(userId: string): Promise<string[]> {
    try {
      const redis = await getRedisClient();
      const pattern = `room:*`;
      const keys = await redis.keys(pattern);
      
      const userRooms: string[] = [];
      for (const key of keys) {
        const isMember = await redis.sIsMember(key, userId);
        if (isMember) {
          // Extract room name from key (remove 'room:' prefix)
          userRooms.push(key.substring(5));
        }
      }
      
      return userRooms;
    } catch (error) {
      logger.error({ error, userId }, 'Error getting user rooms');
      return [];
    }
  }

  /**
   * Broadcast event to a room
   * @param roomName - Room name
   * @param event - Event name
   * @param data - Event data
   */
  broadcastToRoom(roomName: string, event: string, data: any): void {
    try {
      const io = wsServer.getIO();
      io.to(roomName).emit(event, data);
      logger.debug({ roomName, event }, 'Broadcast to room');
    } catch (error) {
      logger.error({ error, roomName, event }, 'Error broadcasting to room');
    }
  }

  /**
   * Add a member to a room in Redis
   * @param roomName - Room name
   * @param userId - User ID
   */
  private async addRoomMember(roomName: string, userId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `room:${roomName}`;
      await redis.sAdd(key, userId);
      await redis.expire(key, this.ROOM_TTL);
    } catch (error) {
      logger.error({ error, roomName, userId }, 'Error adding room member to Redis');
    }
  }

  /**
   * Remove a member from a room in Redis
   * @param roomName - Room name
   * @param userId - User ID
   */
  private async removeRoomMember(roomName: string, userId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `room:${roomName}`;
      await redis.sRem(key, userId);
      
      // Clean up empty rooms
      const memberCount = await redis.sCard(key);
      if (memberCount === 0) {
        await redis.del(key);
      }
    } catch (error) {
      logger.error({ error, roomName, userId }, 'Error removing room member from Redis');
    }
  }
}

// Export singleton instance
export const roomManager = new RoomManager();

