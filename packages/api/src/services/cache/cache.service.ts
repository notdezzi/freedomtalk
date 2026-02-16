/**
 * Cache Service
 *
 * Provides Redis-based caching for frequently accessed data with:
 * - Automatic expiration (TTL)
 * - Cache invalidation patterns
 * - Fallback to database when cache misses
 * - Support for batch operations
 */

import { getRedisClient } from '../../config/redis';
import { db } from '../../config/database';
import { logger } from '../../config/logger';

// Cache key prefixes
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
} as const;

// Default TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute - for frequently changing data
  MEDIUM: 300, // 5 minutes - for moderately changing data
  LONG: 3600, // 1 hour - for relatively stable data
  VERY_LONG: 86400, // 24 hours - for rarely changing data
} as const;

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

class CacheService {
  /**
   * Get a value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const redis = await getRedisClient();
      const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
      const data = await redis.get(fullKey);

      if (data) {
        logger.debug({ key: fullKey }, 'Cache hit');
        return JSON.parse(data) as T;
      }

      logger.debug({ key: fullKey }, 'Cache miss');
      return null;
    } catch (error) {
      logger.error({ error, key }, 'Cache get error');
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
      const ttl = options?.ttl ?? CACHE_TTL.MEDIUM;

      await redis.setEx(fullKey, ttl, JSON.stringify(value));
      logger.debug({ key: fullKey, ttl }, 'Cache set');
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache set error');
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;

      await redis.del(fullKey);
      logger.debug({ key: fullKey }, 'Cache delete');
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache delete error');
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const redis = await getRedisClient();
      let deleted = 0;

      // SCAN for matching keys using the iterator
      for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        await redis.del(key);
        deleted++;
      }

      logger.debug({ pattern, deleted }, 'Cache pattern delete');
      return deleted;
    } catch (error) {
      logger.error({ error, pattern }, 'Cache pattern delete error');
      return 0;
    }
  }

  /**
   * Get or set pattern - fetch from cache, or from DB and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T | null>,
    options?: CacheOptions
  ): Promise<T | null> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    if (data !== null) {
      await this.set(key, data, options);
    }

    return data;
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[], options?: CacheOptions): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();

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
          result.set(originalKey, JSON.parse(value) as T);
        } else {
          result.set(originalKey, null);
        }
      });

      return result;
    } catch (error) {
      logger.error({ error, keys }, 'Cache mget error');
      keys.forEach((k) => result.set(k, null));
      return result;
    }
  }

  /**
   * Batch set multiple keys
   */
  async mset<T>(entries: Array<{ key: string; value: T }>, options?: CacheOptions): Promise<boolean> {
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
    } catch (error) {
      logger.error({ error }, 'Cache mset error');
      return false;
    }
  }

  // ==================== USER CACHING ====================

  /**
   * Get user by ID (with caching)
   */
  async getUser(userId: string): Promise<Record<string, unknown> | null> {
    return this.getOrSet(
      userId,
      async () => {
        const user = await db('users').where('id', userId).first();
        return user || null;
      },
      { prefix: CACHE_KEYS.USER, ttl: CACHE_TTL.LONG }
    );
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.delete(userId, { prefix: CACHE_KEYS.USER });
    await this.delete(userId, { prefix: CACHE_KEYS.USER_PROFILE });
  }

  // ==================== DM CHANNEL CACHING ====================

  /**
   * Get DM channel by ID (with caching)
   */
  async getDMChannel(channelId: string): Promise<Record<string, unknown> | null> {
    return this.getOrSet(
      channelId,
      async () => {
        const channel = await db('dm_channels').where('id', channelId).first();
        return channel || null;
      },
      { prefix: CACHE_KEYS.DM_CHANNEL, ttl: CACHE_TTL.MEDIUM }
    );
  }

  /**
   * Get DM channel participants (with caching)
   */
  async getDMParticipants(channelId: string): Promise<Record<string, unknown>[] | null> {
    return this.getOrSet(
      channelId,
      async () => {
        const participants = await db('dm_channel_participants')
          .where('dm_channel_id', channelId)
          .where('is_active', true);
        return participants;
      },
      { prefix: CACHE_KEYS.DM_PARTICIPANTS, ttl: CACHE_TTL.MEDIUM }
    );
  }

  /**
   * Invalidate DM channel cache
   */
  async invalidateDMChannel(channelId: string): Promise<void> {
    await this.delete(channelId, { prefix: CACHE_KEYS.DM_CHANNEL });
    await this.delete(channelId, { prefix: CACHE_KEYS.DM_PARTICIPANTS });
  }

  /**
   * Invalidate user's DM list cache
   */
  async invalidateUserDMs(userId: string): Promise<void> {
    await this.delete(userId, { prefix: CACHE_KEYS.USER_DMS });
  }

  // ==================== PRESENCE CACHING ====================

  /**
   * Get user presence (with caching)
   */
  async getUserPresence(userId: string): Promise<Record<string, unknown> | null> {
    return this.getOrSet(
      userId,
      async () => {
        // Presence is primarily stored in Redis, so this is a passthrough
        return null;
      },
      { prefix: CACHE_KEYS.PRESENCE, ttl: CACHE_TTL.SHORT }
    );
  }

  /**
   * Invalidate presence cache
   */
  async invalidatePresence(userId: string): Promise<void> {
    await this.delete(userId, { prefix: CACHE_KEYS.PRESENCE });
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Check cache health
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; latency?: number; message?: string }> {
    try {
      const start = Date.now();
      const redis = await getRedisClient();
      await redis.ping();
      const latency = Date.now() - start;

      return { status: 'ok', latency };
    } catch (error) {
      return { status: 'error', message: String(error) };
    }
  }
}

export const cacheService = new CacheService();
