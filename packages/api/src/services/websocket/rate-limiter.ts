/**
 * WebSocket Rate Limiter
 *
 * Per-connection, per-event token-bucket rate limiting for Socket.io events:
 * - In-memory Map keyed by socketId → per-event token buckets
 * - Refill-on-read: buckets refill continuously at limit/windowMs tokens per ms
 * - State is reset on socket disconnect (see resetRateLimitState) to avoid leaks
 * - Ingestion backpressure: bounds the number of in-flight (dispatched-but-not-
 *   yet-acknowledged) message:create events per socket
 */

import { Socket } from 'socket.io';
import { logger } from '../../config/logger';

/**
 * Token bucket configuration for a single event
 */
export interface EventRateLimit {
  /** Bucket capacity / burst size (maximum events available instantly) */
  limit: number;
  /** Time window (ms) over which the bucket fully refills */
  windowMs: number;
}

/**
 * Rate limiter options
 */
export interface RateLimiterOptions {
  /** Per-event limits; events not listed fall back to defaultLimit */
  limits?: Record<string, EventRateLimit>;
  /** Limit applied to events without an explicit entry */
  defaultLimit?: EventRateLimit;
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the event may be dispatched */
  allowed: boolean;
  /** When not allowed: milliseconds until the next token becomes available */
  retryAfterMs: number;
}

/**
 * Default per-event limits
 * - message:create: 30 per 10s (chat flood protection)
 * - typing:start: 20 per 10s (typing indicators are high-frequency by design)
 * - voice:join / voice:leave: 10 per 10s (channel hopping abuse)
 * - voice:state_update: 20 per 10s (mute/deaf toggles)
 * - dm_channel:create: 5 per 10s (DM/call spam protection)
 */
export const DEFAULT_EVENT_LIMITS: Record<string, EventRateLimit> = {
  'message:create': { limit: 30, windowMs: 10000 },
  'typing:start': { limit: 20, windowMs: 10000 },
  'voice:join': { limit: 10, windowMs: 10000 },
  'voice:leave': { limit: 10, windowMs: 10000 },
  'voice:state_update': { limit: 20, windowMs: 10000 },
  'dm_channel:create': { limit: 5, windowMs: 10000 },
};

/**
 * Default limit for events without an explicit entry
 */
export const DEFAULT_EVENT_LIMIT: EventRateLimit = { limit: 60, windowMs: 10000 };

/**
 * Maximum number of in-flight (dispatched-but-unacknowledged) message:create
 * events allowed per socket before further message:create events are rejected
 */
export const MAX_IN_FLIGHT_MESSAGE_CREATE = 5;

/**
 * Internal token bucket state
 */
interface TokenBucket {
  /** Currently available tokens (may be fractional due to continuous refill) */
  tokens: number;
  /** Timestamp (ms) of the last refill applied to this bucket */
  lastRefillMs: number;
}

/**
 * Rate limiter interface returned by createRateLimiter
 */
export interface RateLimiter {
  /**
   * Consume one token for the given socket/event
   * @param socketId - Socket ID
   * @param event - WebSocket event name
   * @returns Whether the event is allowed and, when denied, how long to wait
   */
  enforce(socketId: string, event: string): RateLimitResult;

  /**
   * Drop all bucket state for a socket (call on disconnect)
   * @param socketId - Socket ID
   */
  resetSocket(socketId: string): void;

  /**
   * Number of sockets currently tracked (monitoring/tests)
   */
  trackedSocketCount(): number;
}

/**
 * Create a token-bucket rate limiter instance
 *
 * Buckets live in a nested Map (socketId → event → bucket) so per-socket
 * cleanup on disconnect is a single Map delete.
 *
 * @param options - Optional limit overrides
 * @returns Rate limiter instance
 */
export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const limits: Record<string, EventRateLimit> = { ...DEFAULT_EVENT_LIMITS, ...options.limits };
  const defaultLimit = options.defaultLimit || DEFAULT_EVENT_LIMIT;
  const buckets = new Map<string, Map<string, TokenBucket>>();

  /**
   * Get the effective limit for an event
   */
  function getLimit(event: string): EventRateLimit {
    return limits[event] || defaultLimit;
  }

  /**
   * Apply refill-on-read to a bucket: tokens regenerate continuously at
   * (limit / windowMs) tokens per ms, capped at the bucket capacity
   */
  function refillBucket(bucket: TokenBucket, config: EventRateLimit, nowMs: number): void {
    const elapsedMs = nowMs - bucket.lastRefillMs;
    if (elapsedMs <= 0) {
      return;
    }
    const refillRate = config.limit / config.windowMs;
    bucket.tokens = Math.min(config.limit, bucket.tokens + elapsedMs * refillRate);
    bucket.lastRefillMs = nowMs;
  }

  return {
    enforce(socketId: string, event: string): RateLimitResult {
      const config = getLimit(event);
      const nowMs = Date.now();

      let socketBuckets = buckets.get(socketId);
      if (!socketBuckets) {
        socketBuckets = new Map();
        buckets.set(socketId, socketBuckets);
      }

      let bucket = socketBuckets.get(event);
      if (!bucket) {
        bucket = { tokens: config.limit, lastRefillMs: nowMs };
        socketBuckets.set(event, bucket);
      }

      refillBucket(bucket, config, nowMs);

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { allowed: true, retryAfterMs: 0 };
      }

      const refillRate = config.limit / config.windowMs;
      const retryAfterMs = Math.ceil((1 - bucket.tokens) / refillRate);
      logger.debug({ socketId, event, retryAfterMs }, 'WebSocket rate limit exceeded');
      return { allowed: false, retryAfterMs };
    },

    resetSocket(socketId: string): void {
      buckets.delete(socketId);
    },

    trackedSocketCount(): number {
      return buckets.size;
    },
  };
}

/**
 * Shared rate limiter used by the WebSocket layer
 */
export const wsRateLimiter = createRateLimiter();

/**
 * Middleware-style helper: check whether a socket may dispatch an event.
 * Uses the shared wsRateLimiter singleton.
 *
 * @param socket - Socket instance (only the ID is required)
 * @param event - WebSocket event name
 * @returns Whether the event is allowed and, when denied, how long to wait
 */
export function enforceRateLimit(socket: Pick<Socket, 'id'>, event: string): RateLimitResult {
  return wsRateLimiter.enforce(socket.id, event);
}

// ---------------------------------------------------------------------------
// Ingestion backpressure
// ---------------------------------------------------------------------------

/**
 * In-flight (dispatched-but-unacknowledged) message:create counts per socket.
 * A message is counted from the moment its handler is dispatched until the
 * handler completes and the 'message:ack' (or an error) has been emitted.
 */
const inFlightMessageCounts = new Map<string, number>();

/**
 * Try to reserve an in-flight message:create slot for a socket
 *
 * @param socketId - Socket ID
 * @param max - Maximum in-flight messages (default MAX_IN_FLIGHT_MESSAGE_CREATE)
 * @returns True if the slot was reserved, false if the socket is at the limit
 */
export function tryAcquireInFlight(socketId: string, max: number = MAX_IN_FLIGHT_MESSAGE_CREATE): boolean {
  const current = inFlightMessageCounts.get(socketId) || 0;
  if (current >= max) {
    logger.debug({ socketId, current, max }, 'WebSocket in-flight message limit exceeded');
    return false;
  }
  inFlightMessageCounts.set(socketId, current + 1);
  return true;
}

/**
 * Release an in-flight message:create slot (call once the ack is emitted)
 * @param socketId - Socket ID
 */
export function releaseInFlight(socketId: string): void {
  const current = inFlightMessageCounts.get(socketId) || 0;
  if (current <= 1) {
    inFlightMessageCounts.delete(socketId);
  } else {
    inFlightMessageCounts.set(socketId, current - 1);
  }
}

/**
 * Get the current in-flight message:create count for a socket
 * @param socketId - Socket ID
 * @returns Number of in-flight messages
 */
export function getInFlightCount(socketId: string): number {
  return inFlightMessageCounts.get(socketId) || 0;
}

/**
 * Reset all rate limiting and backpressure state for a socket.
 * Register this on socket disconnect to avoid memory leaks.
 *
 * @param socketId - Socket ID
 */
export function resetRateLimitState(socketId: string): void {
  wsRateLimiter.resetSocket(socketId);
  inFlightMessageCounts.delete(socketId);
}
