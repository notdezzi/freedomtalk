import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { roomManager, RoomType } from './room.manager';

/**
 * Typing Manager class
 * Manages typing indicators for channels
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
   */
  async startTyping(userId: string, channelId: string): Promise<void> {
    try {
      // Check debounce
      const key = `${userId}:${channelId}`;
      const now = Date.now();
      const lastTime = this.lastTypingTime.get(key);
      
      if (lastTime && now - lastTime < this.DEBOUNCE_INTERVAL) {
        logger.debug({ userId, channelId }, 'Typing event debounced');
        return;
      }

      // Update last typing time
      this.lastTypingTime.set(key, now);

      // Add to Redis set
      const redis = await getRedisClient();
      const redisKey = `typing:${channelId}`;
      await redis.sAdd(redisKey, userId);
      await redis.expire(redisKey, this.TYPING_TTL);

      // Broadcast typing start
      this.broadcastTypingStart(userId, channelId);

      // Set up automatic timeout
      this.setupTimeout(userId, channelId);

      logger.debug({ userId, channelId }, 'User started typing');
    } catch (error) {
      logger.error({ error, userId, channelId }, 'Error starting typing indicator');
    }
  }

  /**
   * Stop typing indicator
   * @param userId - User ID
   * @param channelId - Channel ID
   */
  async stopTyping(userId: string, channelId: string): Promise<void> {
    try {
      // Remove from Redis set
      const redis = await getRedisClient();
      const redisKey = `typing:${channelId}`;
      await redis.sRem(redisKey, userId);

      // Broadcast typing stop
      this.broadcastTypingStop(userId, channelId);

      // Clear timeout
      const key = `${userId}:${channelId}`;
      const timeout = this.typingTimeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }

      logger.debug({ userId, channelId }, 'User stopped typing');
    } catch (error) {
      logger.error({ error, userId, channelId }, 'Error stopping typing indicator');
    }
  }

  /**
   * Get users currently typing in a channel
   * @param channelId - Channel ID
   * @returns Set of user IDs
   */
  async getTypingUsers(channelId: string): Promise<Set<string>> {
    try {
      const redis = await getRedisClient();
      const key = `typing:${channelId}`;
      const userIds = await redis.sMembers(key);
      return new Set(userIds);
    } catch (error) {
      logger.error({ error, channelId }, 'Error getting typing users');
      return new Set();
    }
  }

  /**
   * Set up automatic timeout for typing indicator
   * @param userId - User ID
   * @param channelId - Channel ID
   */
  private setupTimeout(userId: string, channelId: string): void {
    const key = `${userId}:${channelId}`;
    
    // Clear existing timeout
    const existingTimeout = this.typingTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.stopTyping(userId, channelId);
      this.typingTimeouts.delete(key);
    }, this.TYPING_TTL * 1000);

    this.typingTimeouts.set(key, timeout);
  }

  /**
   * Broadcast typing start to channel
   * @param userId - User ID
   * @param channelId - Channel ID
   */
  private broadcastTypingStart(userId: string, channelId: string): void {
    try {
      const roomName = roomManager.getRoomName(RoomType.CHANNEL, channelId);
      roomManager.broadcastToRoom(roomName, WS_EVENTS.TYPING_START, {
        userId,
        channelId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error, userId, channelId }, 'Error broadcasting typing start');
    }
  }

  /**
   * Broadcast typing stop to channel
   * @param userId - User ID
   * @param channelId - Channel ID
   */
  private broadcastTypingStop(userId: string, channelId: string): void {
    try {
      const roomName = roomManager.getRoomName(RoomType.CHANNEL, channelId);
      roomManager.broadcastToRoom(roomName, WS_EVENTS.TYPING_STOP, {
        userId,
        channelId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error, userId, channelId }, 'Error broadcasting typing stop');
    }
  }
}

// Export singleton instance
export const typingManager = new TypingManager();

