import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { wsServer } from './websocket.server';

/**
 * Presence Manager class
 * Tracks user online/offline status
 */
class PresenceManager {
  private readonly PRESENCE_TTL = 60; // 60 seconds

  /**
   * Set user as online
   * @param userId - User ID
   */
  async setOnline(userId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `presence:${userId}`;
      
      // Set presence with TTL
      await redis.set(key, 'online', { EX: this.PRESENCE_TTL });

      // Broadcast presence update
      this.broadcastPresenceUpdate(userId, 'online');

      logger.debug({ userId }, 'User set to online');
    } catch (error) {
      logger.error({ error, userId }, 'Error setting user online');
    }
  }

  /**
   * Set user as offline
   * @param userId - User ID
   */
  async setOffline(userId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `presence:${userId}`;
      
      // Delete presence key
      await redis.del(key);

      // Broadcast presence update
      this.broadcastPresenceUpdate(userId, 'offline');

      logger.debug({ userId }, 'User set to offline');
    } catch (error) {
      logger.error({ error, userId }, 'Error setting user offline');
    }
  }

  /**
   * Get user presence
   * @param userId - User ID
   * @returns 'online' or 'offline'
   */
  async getPresence(userId: string): Promise<'online' | 'offline'> {
    try {
      const redis = await getRedisClient();
      const key = `presence:${userId}`;
      const presence = await redis.get(key);
      return presence === 'online' ? 'online' : 'offline';
    } catch (error) {
      logger.error({ error, userId }, 'Error getting user presence');
      return 'offline';
    }
  }

  /**
   * Refresh user presence (extend TTL)
   * @param userId - User ID
   */
  async refreshPresence(userId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `presence:${userId}`;
      
      // Check if key exists
      const exists = await redis.exists(key);
      if (exists) {
        // Extend TTL
        await redis.expire(key, this.PRESENCE_TTL);
        logger.debug({ userId }, 'User presence refreshed');
      } else {
        // User was offline, set online
        await this.setOnline(userId);
      }
    } catch (error) {
      logger.error({ error, userId }, 'Error refreshing user presence');
    }
  }

  /**
   * Get presence for multiple users
   * @param userIds - Array of user IDs
   * @returns Map of userId -> presence
   */
  async getBulkPresence(userIds: string[]): Promise<Map<string, 'online' | 'offline'>> {
    const presenceMap = new Map<string, 'online' | 'offline'>();

    try {
      const redis = await getRedisClient();
      
      // Get all presence keys
      const keys = userIds.map(id => `presence:${id}`);
      const values = await redis.mGet(keys);

      // Map results
      userIds.forEach((userId, index) => {
        const presence = values[index] === 'online' ? 'online' : 'offline';
        presenceMap.set(userId, presence);
      });
    } catch (error) {
      logger.error({ error, userCount: userIds.length }, 'Error getting bulk presence');
      // Return all offline on error
      userIds.forEach(userId => presenceMap.set(userId, 'offline'));
    }

    return presenceMap;
  }

  /**
   * Broadcast presence update to all connected clients
   * @param userId - User ID
   * @param presence - Presence status
   */
  private broadcastPresenceUpdate(userId: string, presence: 'online' | 'offline'): void {
    try {
      const io = wsServer.getIO();
      io.emit(WS_EVENTS.PRESENCE_UPDATE, {
        userId,
        presence,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error, userId, presence }, 'Error broadcasting presence update');
    }
  }
}

// Export singleton instance
export const presenceManager = new PresenceManager();

