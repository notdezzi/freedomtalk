import { getRedisClient } from '../../config/redis';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
export const CACHE_KEYS = {
    USER: 'user',
    USER_PROFILE: 'user:profile',
    DM_CHANNEL: 'dm:channel',
    DM_PARTICIPANTS: 'dm:participants',
    USER_DMS: 'user:dms',
    PRESENCE: 'presence',
    NOTIFICATION_PREFS: 'notif:prefs',
    EMOJI: 'emoji',
    SERVER_MEMBERS: 'server:members',
};
export const CACHE_TTL = {
    SHORT: 60,
    MEDIUM: 300,
    LONG: 3600,
    VERY_LONG: 86400,
};
class CacheService {
    async get(key, options) {
        try {
            const redis = await getRedisClient();
            const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
            const data = await redis.get(fullKey);
            if (data) {
                logger.debug({ key: fullKey }, 'Cache hit');
                return JSON.parse(data);
            }
            logger.debug({ key: fullKey }, 'Cache miss');
            return null;
        }
        catch (error) {
            logger.error({ error, key }, 'Cache get error');
            return null;
        }
    }
    async set(key, value, options) {
        try {
            const redis = await getRedisClient();
            const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
            const ttl = options?.ttl ?? CACHE_TTL.MEDIUM;
            await redis.setEx(fullKey, ttl, JSON.stringify(value));
            logger.debug({ key: fullKey, ttl }, 'Cache set');
            return true;
        }
        catch (error) {
            logger.error({ error, key }, 'Cache set error');
            return false;
        }
    }
    async delete(key, options) {
        try {
            const redis = await getRedisClient();
            const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
            await redis.del(fullKey);
            logger.debug({ key: fullKey }, 'Cache delete');
            return true;
        }
        catch (error) {
            logger.error({ error, key }, 'Cache delete error');
            return false;
        }
    }
    async deletePattern(pattern) {
        try {
            const redis = await getRedisClient();
            let deleted = 0;
            for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
                await redis.del(key);
                deleted++;
            }
            logger.debug({ pattern, deleted }, 'Cache pattern delete');
            return deleted;
        }
        catch (error) {
            logger.error({ error, pattern }, 'Cache pattern delete error');
            return 0;
        }
    }
    async getOrSet(key, fetchFn, options) {
        const cached = await this.get(key, options);
        if (cached !== null) {
            return cached;
        }
        const data = await fetchFn();
        if (data !== null) {
            await this.set(key, data, options);
        }
        return data;
    }
    async mget(keys, options) {
        const result = new Map();
        if (keys.length === 0) {
            return result;
        }
        try {
            const redis = await getRedisClient();
            const fullKeys = keys.map((k) => (options?.prefix ? `${options.prefix}:${k}` : k));
            const data = await redis.mGet(fullKeys);
            keys.forEach((originalKey, index) => {
                const value = data[index];
                if (value) {
                    result.set(originalKey, JSON.parse(value));
                }
                else {
                    result.set(originalKey, null);
                }
            });
            return result;
        }
        catch (error) {
            logger.error({ error, keys }, 'Cache mget error');
            keys.forEach((k) => result.set(k, null));
            return result;
        }
    }
    async mset(entries, options) {
        if (entries.length === 0) {
            return true;
        }
        try {
            const redis = await getRedisClient();
            const ttl = options?.ttl ?? CACHE_TTL.MEDIUM;
            const multi = redis.multi();
            entries.forEach(({ key, value }) => {
                const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
                multi.setEx(fullKey, ttl, JSON.stringify(value));
            });
            await multi.exec();
            logger.debug({ count: entries.length, ttl }, 'Cache mset');
            return true;
        }
        catch (error) {
            logger.error({ error }, 'Cache mset error');
            return false;
        }
    }
    async getUser(userId) {
        return this.getOrSet(userId, async () => {
            const user = await db('users').where('id', userId).first();
            return user || null;
        }, { prefix: CACHE_KEYS.USER, ttl: CACHE_TTL.LONG });
    }
    async invalidateUser(userId) {
        await this.delete(userId, { prefix: CACHE_KEYS.USER });
        await this.delete(userId, { prefix: CACHE_KEYS.USER_PROFILE });
    }
    async getDMChannel(channelId) {
        return this.getOrSet(channelId, async () => {
            const channel = await db('dm_channels').where('id', channelId).first();
            return channel || null;
        }, { prefix: CACHE_KEYS.DM_CHANNEL, ttl: CACHE_TTL.MEDIUM });
    }
    async getDMParticipants(channelId) {
        return this.getOrSet(channelId, async () => {
            const participants = await db('dm_channel_participants')
                .where('dm_channel_id', channelId)
                .where('is_active', true);
            return participants;
        }, { prefix: CACHE_KEYS.DM_PARTICIPANTS, ttl: CACHE_TTL.MEDIUM });
    }
    async invalidateDMChannel(channelId) {
        await this.delete(channelId, { prefix: CACHE_KEYS.DM_CHANNEL });
        await this.delete(channelId, { prefix: CACHE_KEYS.DM_PARTICIPANTS });
    }
    async invalidateUserDMs(userId) {
        await this.delete(userId, { prefix: CACHE_KEYS.USER_DMS });
    }
    async getUserPresence(userId) {
        return this.getOrSet(userId, async () => {
            return null;
        }, { prefix: CACHE_KEYS.PRESENCE, ttl: CACHE_TTL.SHORT });
    }
    async invalidatePresence(userId) {
        await this.delete(userId, { prefix: CACHE_KEYS.PRESENCE });
    }
    async healthCheck() {
        try {
            const start = Date.now();
            const redis = await getRedisClient();
            await redis.ping();
            const latency = Date.now() - start;
            return { status: 'ok', latency };
        }
        catch (error) {
            return { status: 'error', message: String(error) };
        }
    }
}
export const cacheService = new CacheService();
//# sourceMappingURL=cache.service.js.map