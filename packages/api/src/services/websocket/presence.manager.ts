import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { wsServer } from './websocket.server';
import { dmChannelService } from '../dm/dm-channel.service';

/**
 * Presence Manager class
 * Tracks user online/offline status
 */
class PresenceManager {
  private readonly PRESENCE_TTL = 60; // 60 seconds
  private readonly DM_PARTICIPANTS_CACHE_TTL = 300; // 5 minutes

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
      await this.broadcastPresenceUpdate(userId, 'online');

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
      await this.broadcastPresenceUpdate(userId, 'offline');

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
   * Subscribe to presence updates for DM participants
   * @param userId - User ID subscribing
   * @param dmChannelId - DM channel ID
   */
  async subscribeToDMPresence(userId: string, dmChannelId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `dm:presence_sub:${userId}:${dmChannelId}`;

      // Set subscription with TTL (auto-expire if not refreshed)
      await redis.set(key, '1', { EX: this.DM_PARTICIPANTS_CACHE_TTL });

      logger.debug({ userId, dmChannelId }, 'Subscribed to DM presence');
    } catch (error) {
      logger.error({ error, userId, dmChannelId }, 'Error subscribing to DM presence');
    }
  }

  /**
   * Unsubscribe from presence updates for DM participants
   * @param userId - User ID unsubscribing
   * @param dmChannelId - DM channel ID
   */
  async unsubscribeFromDMPresence(userId: string, dmChannelId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `dm:presence_sub:${userId}:${dmChannelId}`;

      await redis.del(key);

      logger.debug({ userId, dmChannelId }, 'Unsubscribed from DM presence');
    } catch (error) {
      logger.error({ error, userId, dmChannelId }, 'Error unsubscribing from DM presence');
    }
  }

  /**
   * Get presence status of all DM participants
   * @param dmChannelId - DM channel ID
   * @returns Map of userId -> presence for all participants
   */
  async getDMParticipantPresence(dmChannelId: string): Promise<Map<string, 'online' | 'offline'>> {
    try {
      // Get participant IDs (with caching)
      const participantIds = await this.getCachedDMParticipants(dmChannelId);

      if (participantIds.length === 0) {
        return new Map();
      }

      // Get presence for all participants
      return this.getBulkPresence(participantIds);
    } catch (error) {
      logger.error({ error, dmChannelId }, 'Error getting DM participant presence');
      return new Map();
    }
  }

  /**
   * Get cached DM participant IDs
   * @param dmChannelId - DM channel ID
   * @returns Array of participant user IDs
   */
  private async getCachedDMParticipants(dmChannelId: string): Promise<string[]> {
    try {
      const redis = await getRedisClient();
      const cacheKey = `dm:participants:${dmChannelId}`;

      // Try to get from cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const participantIds = await dmChannelService.getParticipantUserIds(dmChannelId);

      // Cache the result
      await redis.set(cacheKey, JSON.stringify(participantIds), { EX: this.DM_PARTICIPANTS_CACHE_TTL });

      return participantIds;
    } catch (error) {
      logger.error({ error, dmChannelId }, 'Error getting cached DM participants');
      return [];
    }
  }

  /**
   * Invalidate DM participants cache
   * @param dmChannelId - DM channel ID
   */
  async invalidateDMParticipantsCache(dmChannelId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const cacheKey = `dm:participants:${dmChannelId}`;
      await redis.del(cacheKey);
      logger.debug({ dmChannelId }, 'DM participants cache invalidated');
    } catch (error) {
      logger.error({ error, dmChannelId }, 'Error invalidating DM participants cache');
    }
  }

  /**
   * Broadcast presence update to all connected clients and DM rooms
   * @param userId - User ID
   * @param presence - Presence status
   */
  private async broadcastPresenceUpdate(userId: string, presence: 'online' | 'offline'): Promise<void> {
    try {
      const io = wsServer.getIO();
      const timestamp = new Date().toISOString();

      // Broadcast globally
      io.emit(WS_EVENTS.PRESENCE_UPDATE, {
        userId,
        presence,
        timestamp,
      });

      // Also broadcast to all DM channels the user is in
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
    } catch (error) {
      logger.error({ error, userId, presence }, 'Error broadcasting presence update');
    }
  }
}

// Export singleton instance
export const presenceManager = new PresenceManager();

