/**
 * WebSocket Rate Limiter Tests
 *
 * Pure unit tests for the per-connection, per-event token-bucket rate limiter
 * and the message:create ingestion backpressure tracker. No DB/Redis needed —
 * refill behavior is exercised with fake timers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createRateLimiter,
  enforceRateLimit,
  tryAcquireInFlight,
  releaseInFlight,
  getInFlightCount,
  resetRateLimitState,
  DEFAULT_EVENT_LIMITS,
  DEFAULT_EVENT_LIMIT,
  MAX_IN_FLIGHT_MESSAGE_CREATE,
} from '../rate-limiter';

vi.mock('../../../config/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('rate limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Isolate tests from each other's state in the shared singleton and the
    // module-level in-flight tracker
    resetRateLimitState('socket-1');
    resetRateLimitState('socket-2');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createRateLimiter', () => {
    it('should allow a full burst up to the configured limit', () => {
      const limiter = createRateLimiter();
      const limit = DEFAULT_EVENT_LIMITS['message:create']!.limit;

      for (let i = 0; i < limit; i++) {
        expect(limiter.enforce('socket-1', 'message:create').allowed).toBe(true);
      }
      // Bucket exhausted
      expect(limiter.enforce('socket-1', 'message:create').allowed).toBe(false);
    });

    it('should deny requests once the bucket is exhausted and report retryAfterMs', () => {
      const limiter = createRateLimiter();
      const limit = DEFAULT_EVENT_LIMITS['typing:start']!.limit;
      const windowMs = DEFAULT_EVENT_LIMITS['typing:start']!.windowMs;

      for (let i = 0; i < limit; i++) {
        limiter.enforce('socket-1', 'typing:start');
      }

      const result = limiter.enforce('socket-1', 'typing:start');
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
      // The bucket is empty: a full token needs roughly windowMs/limit ms
      expect(result.retryAfterMs).toBe(Math.ceil(windowMs / limit));
    });

    it('should refill tokens over time (refill-on-read)', () => {
      const limiter = createRateLimiter();
      const { limit, windowMs } = DEFAULT_EVENT_LIMITS['message:create']!;

      // Exhaust the bucket
      for (let i = 0; i < limit; i++) {
        limiter.enforce('socket-1', 'message:create');
      }
      expect(limiter.enforce('socket-1', 'message:create').allowed).toBe(false);

      // Advance halfway through the window: ~limit/2 tokens refilled
      vi.advanceTimersByTime(windowMs / 2);

      let allowed = 0;
      for (let i = 0; i < limit; i++) {
        if (limiter.enforce('socket-1', 'message:create').allowed) {
          allowed++;
        }
      }
      expect(allowed).toBeGreaterThanOrEqual(Math.floor(limit / 2) - 1);
      expect(allowed).toBeLessThan(limit);

      // Advance past the full window: the bucket is full again
      vi.advanceTimersByTime(windowMs);
      for (let i = 0; i < limit; i++) {
        expect(limiter.enforce('socket-1', 'message:create').allowed).toBe(true);
      }
      expect(limiter.enforce('socket-1', 'message:create').allowed).toBe(false);
    });

    it('should isolate buckets per socket', () => {
      const limiter = createRateLimiter();
      const limit = DEFAULT_EVENT_LIMITS['message:create']!.limit;

      for (let i = 0; i < limit; i++) {
        limiter.enforce('socket-1', 'message:create');
      }
      // socket-1 is exhausted, socket-2 still has a full bucket
      expect(limiter.enforce('socket-1', 'message:create').allowed).toBe(false);
      expect(limiter.enforce('socket-2', 'message:create').allowed).toBe(true);
    });

    it('should isolate buckets per event on the same socket', () => {
      const limiter = createRateLimiter();
      const limit = DEFAULT_EVENT_LIMITS['message:create']!.limit;

      for (let i = 0; i < limit; i++) {
        limiter.enforce('socket-1', 'message:create');
      }
      // message:create exhausted, typing:start unaffected
      expect(limiter.enforce('socket-1', 'message:create').allowed).toBe(false);
      expect(limiter.enforce('socket-1', 'typing:start').allowed).toBe(true);
    });

    it('should apply the default limit to unlisted events', () => {
      const limiter = createRateLimiter();

      for (let i = 0; i < DEFAULT_EVENT_LIMIT.limit; i++) {
        expect(limiter.enforce('socket-1', 'presence:update').allowed).toBe(true);
      }
      expect(limiter.enforce('socket-1', 'presence:update').allowed).toBe(false);
    });

    it('should honor custom options', () => {
      const limiter = createRateLimiter({
        limits: { 'message:create': { limit: 2, windowMs: 1000 } },
        defaultLimit: { limit: 1, windowMs: 1000 },
      });

      expect(limiter.enforce('socket-1', 'message:create').allowed).toBe(true);
      expect(limiter.enforce('socket-1', 'message:create').allowed).toBe(true);
      expect(limiter.enforce('socket-1', 'message:create').allowed).toBe(false);

      expect(limiter.enforce('socket-1', 'room:join').allowed).toBe(true);
      expect(limiter.enforce('socket-1', 'room:join').allowed).toBe(false);
    });

    it('should keep separate limiter instances independent', () => {
      const limiterA = createRateLimiter({ defaultLimit: { limit: 1, windowMs: 1000 } });
      const limiterB = createRateLimiter({ defaultLimit: { limit: 1, windowMs: 1000 } });

      expect(limiterA.enforce('socket-1', 'room:join').allowed).toBe(true);
      expect(limiterA.enforce('socket-1', 'room:join').allowed).toBe(false);
      // Instance B is untouched by A's consumption
      expect(limiterB.enforce('socket-1', 'room:join').allowed).toBe(true);
    });

    it('should reset state on disconnect without affecting other sockets', () => {
      const limiter = createRateLimiter();
      const limit = DEFAULT_EVENT_LIMITS['message:create']!.limit;

      for (let i = 0; i < limit; i++) {
        limiter.enforce('socket-1', 'message:create');
      }
      expect(limiter.enforce('socket-1', 'message:create').allowed).toBe(false);
      expect(limiter.trackedSocketCount()).toBe(1);

      limiter.resetSocket('socket-1');

      expect(limiter.trackedSocketCount()).toBe(0);
      // Fresh bucket after reconnect
      expect(limiter.enforce('socket-1', 'message:create').allowed).toBe(true);
    });
  });

  describe('enforceRateLimit', () => {
    it('should delegate to the shared limiter using the socket id', () => {
      const limit = DEFAULT_EVENT_LIMITS['message:create']!.limit;

      for (let i = 0; i < limit; i++) {
        expect(enforceRateLimit({ id: 'socket-1' }, 'message:create').allowed).toBe(true);
      }

      const denied = enforceRateLimit({ id: 'socket-1' }, 'message:create');
      expect(denied.allowed).toBe(false);
      expect(denied.retryAfterMs).toBeGreaterThan(0);
    });
  });

  describe('ingestion backpressure', () => {
    it('should allow up to MAX_IN_FLIGHT_MESSAGE_CREATE and reject beyond it', () => {
      for (let i = 0; i < MAX_IN_FLIGHT_MESSAGE_CREATE; i++) {
        expect(tryAcquireInFlight('socket-1')).toBe(true);
      }
      expect(getInFlightCount('socket-1')).toBe(MAX_IN_FLIGHT_MESSAGE_CREATE);
      expect(tryAcquireInFlight('socket-1')).toBe(false);

      // Other sockets are unaffected
      expect(tryAcquireInFlight('socket-2')).toBe(true);
    });

    it('should free the slot when the message is acknowledged', () => {
      for (let i = 0; i < MAX_IN_FLIGHT_MESSAGE_CREATE; i++) {
        tryAcquireInFlight('socket-1');
      }
      expect(tryAcquireInFlight('socket-1')).toBe(false);

      releaseInFlight('socket-1');
      expect(getInFlightCount('socket-1')).toBe(MAX_IN_FLIGHT_MESSAGE_CREATE - 1);
      expect(tryAcquireInFlight('socket-1')).toBe(true);
      expect(tryAcquireInFlight('socket-1')).toBe(false);
    });

    it('should not underflow below zero on extra releases', () => {
      releaseInFlight('socket-1');
      expect(getInFlightCount('socket-1')).toBe(0);

      tryAcquireInFlight('socket-1');
      releaseInFlight('socket-1');
      releaseInFlight('socket-1');
      expect(getInFlightCount('socket-1')).toBe(0);
    });

    it('should clear rate limit and in-flight state on disconnect', () => {
      const limit = DEFAULT_EVENT_LIMITS['message:create']!.limit;
      // limit+1 consumption guarantees exhaustion regardless of prior state
      for (let i = 0; i <= limit; i++) {
        enforceRateLimit({ id: 'socket-1' }, 'message:create');
      }
      for (let i = 0; i < MAX_IN_FLIGHT_MESSAGE_CREATE; i++) {
        tryAcquireInFlight('socket-1');
      }
      expect(enforceRateLimit({ id: 'socket-1' }, 'message:create').allowed).toBe(false);
      expect(tryAcquireInFlight('socket-1')).toBe(false);

      resetRateLimitState('socket-1');

      expect(getInFlightCount('socket-1')).toBe(0);
      expect(tryAcquireInFlight('socket-1')).toBe(true);
      expect(enforceRateLimit({ id: 'socket-1' }, 'message:create').allowed).toBe(true);
    });
  });
});
