import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { ApiError, ApiErrorCode } from '../../types/api.types';
import { logger } from '../../config/logger';
import { getRedisClient } from '../../config/redis';
class DMNotificationService {
    CACHE_TTL = 600;
    async getSettings(userId, dmChannelId) {
        try {
            const cached = await this.getCachedSettings(userId, dmChannelId);
            if (cached) {
                return cached;
            }
            let settings = await db('dm_notification_settings')
                .where({ user_id: userId, dm_channel_id: dmChannelId })
                .first();
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
            await this.cacheSettings(userId, dmChannelId, settings);
            return settings;
        }
        catch (error) {
            logger.error({ error, userId, dmChannelId }, 'Error getting notification settings');
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
    async updateSettings(userId, dmChannelId, updates) {
        try {
            const now = new Date();
            const settingsId = generateSnowflakeId();
            const existingSettings = await db('dm_notification_settings')
                .where({ user_id: userId, dm_channel_id: dmChannelId })
                .first();
            let settings;
            if (existingSettings) {
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
            }
            else {
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
            await this.invalidateCache(userId, dmChannelId);
            logger.info({ userId, dmChannelId, updates }, 'Notification settings updated');
            return settings;
        }
        catch (error) {
            logger.error({ error, userId, dmChannelId }, 'Error updating notification settings');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to update notification settings', 500);
        }
    }
    async shouldNotify(userId, dmChannelId, isMention = false) {
        try {
            const settings = await this.getSettings(userId, dmChannelId);
            if (settings.is_muted) {
                if (settings.mute_until && new Date() > settings.mute_until) {
                    await this.updateSettings(userId, dmChannelId, {
                        isMuted: false,
                        muteUntil: null,
                    });
                }
                else {
                    return false;
                }
            }
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
        }
        catch (error) {
            logger.error({ error, userId, dmChannelId }, 'Error checking notification preference');
            return true;
        }
    }
    async muteDM(userId, dmChannelId, duration) {
        const muteUntil = duration ? new Date(Date.now() + duration * 60 * 1000) : null;
        await this.updateSettings(userId, dmChannelId, {
            isMuted: true,
            muteUntil,
        });
        logger.info({ userId, dmChannelId, duration, muteUntil }, 'DM muted');
    }
    async unmuteDM(userId, dmChannelId) {
        await this.updateSettings(userId, dmChannelId, {
            isMuted: false,
            muteUntil: null,
        });
        logger.info({ userId, dmChannelId }, 'DM unmuted');
    }
    async getCachedSettings(userId, dmChannelId) {
        try {
            const redis = await getRedisClient();
            const key = `dm:notification_settings:${userId}:${dmChannelId}`;
            const cached = await redis.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        }
        catch (error) {
            logger.error({ error, userId, dmChannelId }, 'Error getting cached settings');
            return null;
        }
    }
    async cacheSettings(userId, dmChannelId, settings) {
        try {
            const redis = await getRedisClient();
            const key = `dm:notification_settings:${userId}:${dmChannelId}`;
            await redis.set(key, JSON.stringify(settings), { EX: this.CACHE_TTL });
        }
        catch (error) {
            logger.error({ error, userId, dmChannelId }, 'Error caching settings');
        }
    }
    async invalidateCache(userId, dmChannelId) {
        try {
            const redis = await getRedisClient();
            const key = `dm:notification_settings:${userId}:${dmChannelId}`;
            await redis.del(key);
        }
        catch (error) {
            logger.error({ error, userId, dmChannelId }, 'Error invalidating cache');
        }
    }
}
export const dmNotificationService = new DMNotificationService();
//# sourceMappingURL=dm-notification.service.js.map