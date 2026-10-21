/**
 * Redis-backed rate-limit store for @fastify/rate-limit.
 *
 * The plugin's built-in RedisStore requires ioredis (`defineCommand` API);
 * this project uses node-redis, so we implement the plugin's store interface
 * structurally here so limits are shared across horizontally-scaled API
 * instances instead of being counted separately per process.
 *
 * Semantics mirror the plugin's own RedisStore Lua script:
 * - first hit in a window sets the PEXPIRE
 * - continueExceeding re-arms the window after every request past max
 * - exponentialBackoff doubles the window per request past max
 */

import { redisClient } from './redis';
import { logger } from './logger';

interface StoreCtorOptions {
  continueExceeding?: boolean;
  exponentialBackoff?: boolean;
  cache?: number;
  redis?: unknown;
  // The plugin passes merged route options to child(), including these:
  routeInfo?: { method?: string; url?: string };
}

type IncrCallback = (
  error: Error | null,
  result?: { current: number; ttl: number }
) => void;

export class RedisRateLimitStore {
  private continueExceeding: boolean;
  private exponentialBackoff: boolean;
  private keyPrefix: string;

  constructor(options: object = {}) {
    // The plugin passes its own merged options shape (which this store only
    // reads defensively), so we narrow from `object` here.
    const opts = options as StoreCtorOptions;
    this.continueExceeding = opts.continueExceeding ?? false;
    this.exponentialBackoff = opts.exponentialBackoff ?? false;
    const routeInfo = opts.routeInfo;
    const routeKey =
      routeInfo?.method && routeInfo?.url ? `${routeInfo.method}${routeInfo.url}-` : '';
    this.keyPrefix = `ft-rl:${routeKey}`;
  }

  incr(key: string, callback: IncrCallback, timeWindow?: number, max?: number): void {
    const windowMs = timeWindow ?? 60000;
    const maxHits = max ?? 0;
    const fullKey = `${this.keyPrefix}${key}`;

    (async () => {
      const current = await redisClient.incr(fullKey);

      if (current === 1 || (this.continueExceeding && current > maxHits)) {
        await redisClient.pExpire(fullKey, windowMs);
        callback(null, { current, ttl: windowMs });
        return;
      }

      if (this.exponentialBackoff && current > maxHits) {
        const backoffTtl = windowMs * 2 ** Math.max(current - maxHits - 1, 0);
        const capped = Number.isSafeInteger(backoffTtl)
          ? backoffTtl
          : Number.MAX_SAFE_INTEGER;
        await redisClient.pExpire(fullKey, capped);
        callback(null, { current, ttl: capped });
        return;
      }

      let ttl = await redisClient.pTTL(fullKey);
      // A key that somehow lost its TTL would lock the bucket forever;
      // re-arm the window whenever the expiry is missing.
      if (ttl < 0) {
        await redisClient.pExpire(fullKey, windowMs);
        ttl = windowMs;
      }
      callback(null, { current, ttl });
    })().catch((error) => {
      logger.error({ error }, 'Rate limit store incr failed');
      callback(error instanceof Error ? error : new Error(String(error)));
    });
  }

  child(routeOptions: object): RedisRateLimitStore {
    return new RedisRateLimitStore(routeOptions);
  }
}
