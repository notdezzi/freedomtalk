import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { db } from '../../config/database';

/**
 * Subscription Manager class
 * Manages user subscriptions to channels
 */
class SubscriptionManager {
  private readonly SUBSCRIPTION_TTL = 86400; // 24 hours

  /**
   * Subscribe a user to a channel
   * @param userId - User ID
   * @param channelId - Channel ID
   */
  async subscribe(userId: string, channelId: string): Promise<void> {
    try {
      // Store subscription in Redis (user -> channels)
      const redis = await getRedisClient();
      const userKey = `subscriptions:${userId}`;
      await redis.sAdd(userKey, channelId);
      await redis.expire(userKey, this.SUBSCRIPTION_TTL);

      // Store reverse index (channel -> users)
      const channelKey = `subscribers:${channelId}`;
      await redis.sAdd(channelKey, userId);
      await redis.expire(channelKey, this.SUBSCRIPTION_TTL);

      logger.debug({ userId, channelId }, 'User subscribed to channel');
    } catch (error) {
      logger.error({ error, userId, channelId }, 'Error subscribing to channel');
      throw error;
    }
  }

  /**
   * Unsubscribe a user from a channel
   * @param userId - User ID
   * @param channelId - Channel ID
   */
  async unsubscribe(userId: string, channelId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      
      // Remove from user subscriptions
      const userKey = `subscriptions:${userId}`;
      await redis.sRem(userKey, channelId);

      // Remove from channel subscribers
      const channelKey = `subscribers:${channelId}`;
      await redis.sRem(channelKey, userId);

      logger.debug({ userId, channelId }, 'User unsubscribed from channel');
    } catch (error) {
      logger.error({ error, userId, channelId }, 'Error unsubscribing from channel');
      throw error;
    }
  }

  /**
   * Get all channels a user is subscribed to
   * @param userId - User ID
   * @returns Set of channel IDs
   */
  async getUserSubscriptions(userId: string): Promise<Set<string>> {
    try {
      const redis = await getRedisClient();
      const key = `subscriptions:${userId}`;
      const channelIds = await redis.sMembers(key);
      return new Set(channelIds);
    } catch (error) {
      logger.error({ error, userId }, 'Error getting user subscriptions');
      return new Set();
    }
  }

  /**
   * Get all users subscribed to a channel
   * @param channelId - Channel ID
   * @returns Set of user IDs
   */
  async getChannelSubscribers(channelId: string): Promise<Set<string>> {
    try {
      const redis = await getRedisClient();
      const key = `subscribers:${channelId}`;
      const userIds = await redis.sMembers(key);
      return new Set(userIds);
    } catch (error) {
      logger.error({ error, channelId }, 'Error getting channel subscribers');
      return new Set();
    }
  }

  /**
   * Sync user subscriptions from database
   * This method loads the user's accessible channels from the database
   * and syncs them to Redis.
   *
   * Current implementation: Users have access to channels in servers they own.
   * Future enhancement: Add server_members and channel_members tables for granular permissions.
   *
   * @param userId - User ID
   */
  async syncSubscriptions(userId: string): Promise<void> {
    try {
      logger.debug({ userId }, 'Syncing user subscriptions');

      const redis = await getRedisClient();
      const userKey = `subscriptions:${userId}`;

      // Get channels from servers owned by the user
      // In the future, this should also include channels from servers the user is a member of
      const channels = await db('channels')
        .join('servers', 'channels.server_id', 'servers.id')
        .where('servers.owner_id', userId)
        .select('channels.id as channel_id');

      // Clear existing subscriptions
      await redis.del(userKey);

      // Add each channel to subscriptions
      for (const { channel_id } of channels) {
        if (channel_id) {
          await redis.sAdd(userKey, channel_id);

          // Also update reverse index
          const channelKey = `subscribers:${channel_id}`;
          await redis.sAdd(channelKey, userId);
          await redis.expire(channelKey, this.SUBSCRIPTION_TTL);
        }
      }

      // Set TTL on user subscriptions
      if (channels.length > 0) {
        await redis.expire(userKey, this.SUBSCRIPTION_TTL);
      }

      logger.info({ userId, channelCount: channels.length }, 'User subscriptions synced');
    } catch (error) {
      logger.error({ error, userId }, 'Error syncing user subscriptions');
      throw error;
    }
  }

  /**
   * Check if a user is subscribed to a channel
   * @param userId - User ID
   * @param channelId - Channel ID
   * @returns True if subscribed
   */
  async isSubscribed(userId: string, channelId: string): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      const key = `subscriptions:${userId}`;
      return await redis.sIsMember(key, channelId);
    } catch (error) {
      logger.error({ error, userId, channelId }, 'Error checking subscription');
      return false;
    }
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();

