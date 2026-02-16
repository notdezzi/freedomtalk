import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { db } from '../../config/database';
class SubscriptionManager {
    SUBSCRIPTION_TTL = 86400;
    async subscribe(userId, channelId) {
        try {
            const redis = await getRedisClient();
            const userKey = `subscriptions:${userId}`;
            await redis.sAdd(userKey, channelId);
            await redis.expire(userKey, this.SUBSCRIPTION_TTL);
            const channelKey = `subscribers:${channelId}`;
            await redis.sAdd(channelKey, userId);
            await redis.expire(channelKey, this.SUBSCRIPTION_TTL);
            logger.debug({ userId, channelId }, 'User subscribed to channel');
        }
        catch (error) {
            logger.error({ error, userId, channelId }, 'Error subscribing to channel');
            throw error;
        }
    }
    async unsubscribe(userId, channelId) {
        try {
            const redis = await getRedisClient();
            const userKey = `subscriptions:${userId}`;
            await redis.sRem(userKey, channelId);
            const channelKey = `subscribers:${channelId}`;
            await redis.sRem(channelKey, userId);
            logger.debug({ userId, channelId }, 'User unsubscribed from channel');
        }
        catch (error) {
            logger.error({ error, userId, channelId }, 'Error unsubscribing from channel');
            throw error;
        }
    }
    async getUserSubscriptions(userId) {
        try {
            const redis = await getRedisClient();
            const key = `subscriptions:${userId}`;
            const channelIds = await redis.sMembers(key);
            return new Set(channelIds);
        }
        catch (error) {
            logger.error({ error, userId }, 'Error getting user subscriptions');
            return new Set();
        }
    }
    async getChannelSubscribers(channelId) {
        try {
            const redis = await getRedisClient();
            const key = `subscribers:${channelId}`;
            const userIds = await redis.sMembers(key);
            return new Set(userIds);
        }
        catch (error) {
            logger.error({ error, channelId }, 'Error getting channel subscribers');
            return new Set();
        }
    }
    async syncSubscriptions(userId) {
        try {
            logger.debug({ userId }, 'Syncing user subscriptions');
            const redis = await getRedisClient();
            const userKey = `subscriptions:${userId}`;
            const channels = await db('channels')
                .join('servers', 'channels.server_id', 'servers.id')
                .where('servers.owner_id', userId)
                .select('channels.id as channel_id');
            await redis.del(userKey);
            for (const { channel_id } of channels) {
                if (channel_id) {
                    await redis.sAdd(userKey, channel_id);
                    const channelKey = `subscribers:${channel_id}`;
                    await redis.sAdd(channelKey, userId);
                    await redis.expire(channelKey, this.SUBSCRIPTION_TTL);
                }
            }
            if (channels.length > 0) {
                await redis.expire(userKey, this.SUBSCRIPTION_TTL);
            }
            logger.info({ userId, channelCount: channels.length }, 'User subscriptions synced');
        }
        catch (error) {
            logger.error({ error, userId }, 'Error syncing user subscriptions');
            throw error;
        }
    }
    async isSubscribed(userId, channelId) {
        try {
            const redis = await getRedisClient();
            const key = `subscriptions:${userId}`;
            return await redis.sIsMember(key, channelId);
        }
        catch (error) {
            logger.error({ error, userId, channelId }, 'Error checking subscription');
            return false;
        }
    }
}
export const subscriptionManager = new SubscriptionManager();
//# sourceMappingURL=subscription.manager.js.map