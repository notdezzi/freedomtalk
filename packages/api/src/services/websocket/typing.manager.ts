import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { roomManager, RoomType } from './room.manager';
import { wsServer } from './websocket.server';

/**
 * Channel type for typing indicators
 */
export type ChannelType = 'channel' | 'dm';

/**
 * Typing Manager class
 * Manages typing indicators for channels and DMs
 */
class TypingManager {
  private readonly TYPING_TTL = 5; // 5 seconds
  private readonly DEBOUNCE_INTERVAL = 3000; // 3 seconds in milliseconds
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private lastTypingTime: Map<string, number> = new Map();

  /**
   * Start typing indicator
   * @param userId - User ID
   * @param channelId - Channel ID
   * @param channelType - Type of channel ('channel' or 'dm')
   */
  async startTyping(userId: string, channelId: string, channelType: ChannelType = 'channel'): Promise<void> {
    try {
      // Check debounce
      const key = `${userId}:${channelType}:${channelId}`;
      const now = Date.now();
      const lastTime = this.lastTypingTime.get(key);

      if (lastTime && now - lastTime < this.DEBOUNCE_INTERVAL) {
        logger.debug({ userId, channelId, channelType }, 'Typing event debounced');
        return;
      }

      // Update last typing time
      this.lastTypingTime.set(key, now);

      // Add to Redis set
      const redis = await getRedisClient();
      const redisKey = `typing:${channelType}:${channelId}`;
      await redis.sAdd(redisKey, userId);
      await redis.expire(redisKey, this.TYPING_TTL);

      // Broadcast typing start
      this.broadcastTypingStart(userId, channelId, channelType);

      // Set up automatic timeout
      this.setupTimeout(userId, channelId, channelType);

      logger.debug({ userId, channelId, channelType }, 'User started typing');
    } catch (error) {
      logger.error({ error, userId, channelId, channelType }, 'Error starting typing indicator');
    }
  }

  /**
   * Stop typing indicator
   * @param userId - User ID
   * @param channelId - Channel ID
   * @param channelType - Type of channel ('channel' or 'dm')
   */
  async stopTyping(userId: string, channelId: string, channelType: ChannelType = 'channel'): Promise<void> {
    try {
      // Remove from Redis set
      const redis = await getRedisClient();
      const redisKey = `typing:${channelType}:${channelId}`;
      await redis.sRem(redisKey, userId);

      // Broadcast typing stop
      this.broadcastTypingStop(userId, channelId, channelType);

      // Clear timeout
      const key = `${userId}:${channelType}:${channelId}`;
      const timeout = this.typingTimeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }

      logger.debug({ userId, channelId, channelType }, 'User stopped typing');
    } catch (error) {
      logger.error({ error, userId, channelId, channelType }, 'Error stopping typing indicator');
    }
  }

  /**
   * Get users currently typing in a channel
   * @param channelId - Channel ID
   * @param channelType - Type of channel ('channel' or 'dm')
   * @returns Set of user IDs
   */
  async getTypingUsers(channelId: string, channelType: ChannelType = 'channel'): Promise<Set<string>> {
    try {
      const redis = await getRedisClient();
      const key = `typing:${channelType}:${channelId}`;
      const userIds = await redis.sMembers(key);
      return new Set(userIds);
    } catch (error) {
      logger.error({ error, channelId, channelType }, 'Error getting typing users');
      return new Set();
    }
  }

  /**
   * Set up automatic timeout for typing indicator
   * @param userId - User ID
   * @param channelId - Channel ID
   * @param channelType - Type of channel
   */
  private setupTimeout(userId: string, channelId: string, channelType: ChannelType): void {
    const key = `${userId}:${channelType}:${channelId}`;

    // Clear existing timeout
    const existingTimeout = this.typingTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.stopTyping(userId, channelId, channelType);
      this.typingTimeouts.delete(key);
    }, this.TYPING_TTL * 1000);

    this.typingTimeouts.set(key, timeout);
  }

  /**
   * Broadcast typing start to channel or DM
   * @param userId - User ID
   * @param channelId - Channel ID
   * @param channelType - Type of channel
   */
  private broadcastTypingStart(userId: string, channelId: string, channelType: ChannelType): void {
    try {
      const io = wsServer.getIO();
      const timestamp = new Date().toISOString();

      if (channelType === 'dm') {
        // For DMs, broadcast to the DM room
        const roomName = `dm:${channelId}`;
        io.to(roomName).emit(WS_EVENTS.TYPING_START, {
          userId,
          dmChannelId: channelId,
          timestamp,
        });
      } else {
        // For channels, broadcast to the channel room
        const roomName = roomManager.getRoomName(RoomType.CHANNEL, channelId);
        roomManager.broadcastToRoom(roomName, WS_EVENTS.TYPING_START, {
          userId,
          channelId,
          timestamp,
        });
      }
    } catch (error) {
      logger.error({ error, userId, channelId, channelType }, 'Error broadcasting typing start');
    }
  }

  /**
   * Broadcast typing stop to channel or DM
   * @param userId - User ID
   * @param channelId - Channel ID
   * @param channelType - Type of channel
   */
  private broadcastTypingStop(userId: string, channelId: string, channelType: ChannelType): void {
    try {
      const io = wsServer.getIO();
      const timestamp = new Date().toISOString();

      if (channelType === 'dm') {
        // For DMs, broadcast to the DM room
        const roomName = `dm:${channelId}`;
        io.to(roomName).emit(WS_EVENTS.TYPING_STOP, {
          userId,
          dmChannelId: channelId,
          timestamp,
        });
      } else {
        // For channels, broadcast to the channel room
        const roomName = roomManager.getRoomName(RoomType.CHANNEL, channelId);
        roomManager.broadcastToRoom(roomName, WS_EVENTS.TYPING_STOP, {
          userId,
          channelId,
          timestamp,
        });
      }
    } catch (error) {
      logger.error({ error, userId, channelId, channelType }, 'Error broadcasting typing stop');
    }
  }
}

// Export singleton instance
export const typingManager = new TypingManager();

