/**
 * DM Notification Settings Service
 * Handles notification preferences for DM channels
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { ApiError, ApiErrorCode } from '../../types/api.types';
import { logger } from '../../config/logger';
import { getRedisClient } from '../../config/redis';

/**
 * Notification level enum
 */
export type NotificationLevel = 'all' | 'mentions' | 'none';

/**
 * DM Notification Settings interface
 */
export interface DMNotificationSettings {
  id: string;
  user_id: string;
  dm_channel_id: string;
  is_muted: boolean;
  mute_until: Date | null;
  notification_level: NotificationLevel;
  created_at: Date;
  updated_at: Date;
}

/**
 * Update notification settings request
 */
export interface UpdateNotificationSettingsRequest {
  isMuted?: boolean;
  muteUntil?: Date | null;
  notificationLevel?: NotificationLevel;
}

/**
 * DM Notification Service class
 */
class DMNotificationService {
  private readonly CACHE_TTL = 600; // 10 minutes

  /**
   * Get notification settings for a user in a DM channel
   * @param userId - User ID
   * @param dmChannelId - DM channel ID
   * @returns Notification settings or default settings
   */
  async getSettings(userId: string, dmChannelId: string): Promise<DMNotificationSettings> {
    try {
      // Try cache first
      const cached = await this.getCachedSettings(userId, dmChannelId);
      if (cached) {
        return cached;
      }

      // Get from database
      let settings = await db('dm_notification_settings')
        .where({ user_id: userId, dm_channel_id: dmChannelId })
        .first();

      // Return default settings if not found
      if (!settings) {
        settings = {
          id: '',
          user_id: userId,
          dm_channel_id: dmChannelId,
          is_muted: false,
          mute_until: null,
          notification_level: 'all',
          created_at: new Date(),
          updated_at: new Date(),
        };
      }

      // Cache the settings
      await this.cacheSettings(userId, dmChannelId, settings);

      return settings;
    } catch (error) {
      logger.error({ error, userId, dmChannelId }, 'Error getting notification settings');
      // Return default settings on error
      return {
        id: '',
        user_id: userId,
        dm_channel_id: dmChannelId,
        is_muted: false,
        mute_until: null,
        notification_level: 'all',
        created_at: new Date(),
        updated_at: new Date(),
      };
    }
  }

  /**
   * Update notification settings for a user in a DM channel
   * @param userId - User ID
   * @param dmChannelId - DM channel ID
   * @param updates - Settings to update
   * @returns Updated notification settings
   */
  async updateSettings(
    userId: string,
    dmChannelId: string,
    updates: UpdateNotificationSettingsRequest
  ): Promise<DMNotificationSettings> {
    try {
      const now = new Date();
      const settingsId = generateSnowflakeId();

      // Upsert settings
      const existingSettings = await db('dm_notification_settings')
        .where({ user_id: userId, dm_channel_id: dmChannelId })
        .first();

      let settings: DMNotificationSettings;

      if (existingSettings) {
        // Update existing settings
        await db('dm_notification_settings')
          .where({ id: existingSettings.id })
          .update({
            is_muted: updates.isMuted ?? existingSettings.is_muted,
            mute_until: updates.muteUntil !== undefined ? updates.muteUntil : existingSettings.mute_until,
            notification_level: updates.notificationLevel ?? existingSettings.notification_level,
            updated_at: now,
          });

        settings = {
          ...existingSettings,
          is_muted: updates.isMuted ?? existingSettings.is_muted,
          mute_until: updates.muteUntil !== undefined ? updates.muteUntil : existingSettings.mute_until,
          notification_level: updates.notificationLevel ?? existingSettings.notification_level,
          updated_at: now,
        };
      } else {
        // Create new settings
        settings = {
          id: settingsId,
          user_id: userId,
          dm_channel_id: dmChannelId,
          is_muted: updates.isMuted ?? false,
          mute_until: updates.muteUntil ?? null,
          notification_level: updates.notificationLevel ?? 'all',
          created_at: now,
          updated_at: now,
        };

        await db('dm_notification_settings').insert({
          id: settingsId,
          user_id: userId,
          dm_channel_id: dmChannelId,
          is_muted: settings.is_muted,
          mute_until: settings.mute_until,
          notification_level: settings.notification_level,
          created_at: now,
          updated_at: now,
        });
      }

      // Invalidate cache
      await this.invalidateCache(userId, dmChannelId);

      logger.info({ userId, dmChannelId, updates }, 'Notification settings updated');

      return settings;
    } catch (error) {
      logger.error({ error, userId, dmChannelId }, 'Error updating notification settings');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to update notification settings', 500);
    }
  }

  /**
   * Check if a user should be notified for a message
   * @param userId - User ID
   * @param dmChannelId - DM channel ID
   * @param isMention - Whether the user was mentioned
   * @returns True if user should be notified
   */
  async shouldNotify(
    userId: string,
    dmChannelId: string,
    isMention: boolean = false
  ): Promise<boolean> {
    try {
      const settings = await this.getSettings(userId, dmChannelId);

      // Check if muted
      if (settings.is_muted) {
        // Check if mute has expired
        if (settings.mute_until && new Date() > settings.mute_until) {
          // Mute expired, clear it
          await this.updateSettings(userId, dmChannelId, {
            isMuted: false,
            muteUntil: null,
          });
          // Continue to check notification level
        } else {
          return false;
        }
      }

      // Check notification level
      switch (settings.notification_level) {
        case 'all':
          return true;
        case 'mentions':
          return isMention;
        case 'none':
          return false;
        default:
          return true;
      }
    } catch (error) {
      logger.error({ error, userId, dmChannelId }, 'Error checking notification preference');
      // Default to notifying on error
      return true;
    }
  }

  /**
   * Mute a DM channel for a user
   * @param userId - User ID
   * @param dmChannelId - DM channel ID
   * @param duration - Mute duration in minutes (null for indefinite)
   */
  async muteDM(userId: string, dmChannelId: string, duration?: number): Promise<void> {
    const muteUntil = duration ? new Date(Date.now() + duration * 60 * 1000) : null;

    await this.updateSettings(userId, dmChannelId, {
      isMuted: true,
      muteUntil,
    });

    logger.info({ userId, dmChannelId, duration, muteUntil }, 'DM muted');
  }

  /**
   * Unmute a DM channel for a user
   * @param userId - User ID
   * @param dmChannelId - DM channel ID
   */
  async unmuteDM(userId: string, dmChannelId: string): Promise<void> {
    await this.updateSettings(userId, dmChannelId, {
      isMuted: false,
      muteUntil: null,
    });

    logger.info({ userId, dmChannelId }, 'DM unmuted');
  }

  /**
   * Get cached settings from Redis
   */
  private async getCachedSettings(
    userId: string,
    dmChannelId: string
  ): Promise<DMNotificationSettings | null> {
    try {
      const redis = await getRedisClient();
      const key = `dm:notification_settings:${userId}:${dmChannelId}`;
      const cached = await redis.get(key);

      if (cached) {
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      logger.error({ error, userId, dmChannelId }, 'Error getting cached settings');
      return null;
    }
  }

  /**
   * Cache settings in Redis
   */
  private async cacheSettings(
    userId: string,
    dmChannelId: string,
    settings: DMNotificationSettings
  ): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `dm:notification_settings:${userId}:${dmChannelId}`;
      await redis.set(key, JSON.stringify(settings), { EX: this.CACHE_TTL });
    } catch (error) {
      logger.error({ error, userId, dmChannelId }, 'Error caching settings');
    }
  }

  /**
   * Invalidate cached settings
   */
  private async invalidateCache(userId: string, dmChannelId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `dm:notification_settings:${userId}:${dmChannelId}`;
      await redis.del(key);
    } catch (error) {
      logger.error({ error, userId, dmChannelId }, 'Error invalidating cache');
    }
  }
}

// Export singleton instance
export const dmNotificationService = new DMNotificationService();
