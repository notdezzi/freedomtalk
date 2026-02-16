import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { typingManager } from '../typing.manager';
import { getRedisClient } from '../../../config/redis';
import { roomManager } from '../room.manager';
import { WS_EVENTS } from '@freedomtalk/shared';

// Mock dependencies
vi.mock('../../../config/redis');
vi.mock('../../../config/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('../room.manager', () => ({
  roomManager: {
    getRoomName: vi.fn(),
    broadcastToRoom: vi.fn(),
  },
  RoomType: {
    CHANNEL: 'channel',
    SERVER: 'server',
    DM: 'dm',
  },
}));

describe('TypingManager', () => {
  let mockRedis: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset typing manager internal state
    (typingManager as any).lastTypingTime.clear();
    (typingManager as any).typingTimeouts.forEach((timeout: NodeJS.Timeout) => clearTimeout(timeout));
    (typingManager as any).typingTimeouts.clear();

    // Create mock Redis client
    mockRedis = {
      sAdd: vi.fn().mockResolvedValue(1),
      sRem: vi.fn().mockResolvedValue(1),
      sMembers: vi.fn().mockResolvedValue([]),
      expire: vi.fn().mockResolvedValue(1),
    };

    vi.mocked(getRedisClient).mockResolvedValue(mockRedis);
    vi.mocked(roomManager.getRoomName).mockReturnValue('channel:channel-123');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('startTyping', () => {
    it('should add user to typing set in Redis', async () => {
      await typingManager.startTyping('user-1', 'channel-123');

      expect(mockRedis.sAdd).toHaveBeenCalledWith('typing:channel-123', 'user-1');
      expect(mockRedis.expire).toHaveBeenCalledWith('typing:channel-123', 5);
    });

    it('should broadcast typing start event', async () => {
      await typingManager.startTyping('user-1', 'channel-123');

      expect(roomManager.broadcastToRoom).toHaveBeenCalledWith(
        'channel:channel-123',
        WS_EVENTS.TYPING_START,
        expect.objectContaining({
          userId: 'user-1',
          channelId: 'channel-123',
          timestamp: expect.any(String),
        })
      );
    });

    it('should debounce rapid typing events', async () => {
      await typingManager.startTyping('user-1', 'channel-123');
      await typingManager.startTyping('user-1', 'channel-123');
      await typingManager.startTyping('user-1', 'channel-123');

      // Only first call should go through due to debouncing
      expect(mockRedis.sAdd).toHaveBeenCalledTimes(1);
      expect(roomManager.broadcastToRoom).toHaveBeenCalledTimes(1);
    });

    it('should allow typing after debounce interval', async () => {
      await typingManager.startTyping('user-1', 'channel-123');

      // Advance time past debounce interval (3 seconds)
      vi.advanceTimersByTime(3100);

      await typingManager.startTyping('user-1', 'channel-123');

      expect(mockRedis.sAdd).toHaveBeenCalledTimes(2);
      expect(roomManager.broadcastToRoom).toHaveBeenCalledTimes(2);
    });

    it('should automatically stop typing after TTL', async () => {
      await typingManager.startTyping('user-1', 'channel-123');

      // Advance time past TTL (5 seconds) and run async timers
      await vi.advanceTimersByTimeAsync(5100);

      expect(mockRedis.sRem).toHaveBeenCalledWith('typing:channel-123', 'user-1');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.sAdd.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(typingManager.startTyping('user-1', 'channel-123')).resolves.not.toThrow();
    });

    it('should handle different users typing in same channel', async () => {
      await typingManager.startTyping('user-1', 'channel-123');
      await typingManager.startTyping('user-2', 'channel-123');
      await typingManager.startTyping('user-3', 'channel-123');

      expect(mockRedis.sAdd).toHaveBeenCalledTimes(3);
      expect(mockRedis.sAdd).toHaveBeenCalledWith('typing:channel-123', 'user-1');
      expect(mockRedis.sAdd).toHaveBeenCalledWith('typing:channel-123', 'user-2');
      expect(mockRedis.sAdd).toHaveBeenCalledWith('typing:channel-123', 'user-3');
    });

    it('should handle same user typing in different channels', async () => {
      await typingManager.startTyping('user-1', 'channel-123');
      await typingManager.startTyping('user-1', 'channel-456');
      await typingManager.startTyping('user-1', 'channel-789');

      expect(mockRedis.sAdd).toHaveBeenCalledTimes(3);
      expect(mockRedis.sAdd).toHaveBeenCalledWith('typing:channel-123', 'user-1');
      expect(mockRedis.sAdd).toHaveBeenCalledWith('typing:channel-456', 'user-1');
      expect(mockRedis.sAdd).toHaveBeenCalledWith('typing:channel-789', 'user-1');
    });
  });

  describe('stopTyping', () => {
    it('should remove user from typing set in Redis', async () => {
      await typingManager.stopTyping('user-1', 'channel-123');

      expect(mockRedis.sRem).toHaveBeenCalledWith('typing:channel-123', 'user-1');
    });

    it('should broadcast typing stop event', async () => {
      await typingManager.stopTyping('user-1', 'channel-123');

      expect(roomManager.broadcastToRoom).toHaveBeenCalledWith(
        'channel:channel-123',
        WS_EVENTS.TYPING_STOP,
        expect.objectContaining({
          userId: 'user-1',
          channelId: 'channel-123',
          timestamp: expect.any(String),
        })
      );
    });

    it('should clear timeout when stopping typing', async () => {
      await typingManager.startTyping('user-1', 'channel-123');

      // Stop typing before timeout
      await typingManager.stopTyping('user-1', 'channel-123');

      // Advance time past TTL
      vi.advanceTimersByTime(5100);

      // Should only have one sRem call (from stopTyping), not from timeout
      expect(mockRedis.sRem).toHaveBeenCalledTimes(1);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.sRem.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(typingManager.stopTyping('user-1', 'channel-123')).resolves.not.toThrow();
    });
  });

  describe('getTypingUsers', () => {
    it('should return set of typing users', async () => {
      mockRedis.sMembers.mockResolvedValue(['user-1', 'user-2', 'user-3']);

      const typingUsers = await typingManager.getTypingUsers('channel-123');

      expect(mockRedis.sMembers).toHaveBeenCalledWith('typing:channel-123');
      expect(typingUsers).toBeInstanceOf(Set);
      expect(typingUsers.size).toBe(3);
      expect(typingUsers.has('user-1')).toBe(true);
      expect(typingUsers.has('user-2')).toBe(true);
      expect(typingUsers.has('user-3')).toBe(true);
    });

    it('should return empty set when no users are typing', async () => {
      mockRedis.sMembers.mockResolvedValue([]);

      const typingUsers = await typingManager.getTypingUsers('channel-123');

      expect(typingUsers).toBeInstanceOf(Set);
      expect(typingUsers.size).toBe(0);
    });

    it('should return empty set on Redis error', async () => {
      mockRedis.sMembers.mockRejectedValue(new Error('Redis error'));

      const typingUsers = await typingManager.getTypingUsers('channel-123');

      expect(typingUsers).toBeInstanceOf(Set);
      expect(typingUsers.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent typing from multiple users', async () => {
      await Promise.all([
        typingManager.startTyping('user-1', 'channel-123'),
        typingManager.startTyping('user-2', 'channel-123'),
        typingManager.startTyping('user-3', 'channel-123'),
      ]);

      expect(mockRedis.sAdd).toHaveBeenCalledTimes(3);
      expect(roomManager.broadcastToRoom).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid start/stop typing', async () => {
      await typingManager.startTyping('user-1', 'channel-123');
      await typingManager.stopTyping('user-1', 'channel-123');

      // Advance time past debounce to allow second typing event
      await vi.advanceTimersByTimeAsync(3100);

      await typingManager.startTyping('user-1', 'channel-123');
      await typingManager.stopTyping('user-1', 'channel-123');

      expect(mockRedis.sAdd).toHaveBeenCalledTimes(2);
      expect(mockRedis.sRem).toHaveBeenCalledTimes(2);
    });

    it('should handle empty user ID', async () => {
      await typingManager.startTyping('', 'channel-123');

      expect(mockRedis.sAdd).toHaveBeenCalledWith('typing:channel-123', '');
    });

    it('should handle empty channel ID', async () => {
      await typingManager.startTyping('user-1', '');

      expect(mockRedis.sAdd).toHaveBeenCalledWith('typing:', 'user-1');
    });

    it('should handle special characters in IDs', async () => {
      const specialUserId = 'user-!@#$%^&*()';
      const specialChannelId = 'channel-!@#$%^&*()';

      await typingManager.startTyping(specialUserId, specialChannelId);

      expect(mockRedis.sAdd).toHaveBeenCalledWith(`typing:${specialChannelId}`, specialUserId);
    });

    it('should reset timeout on repeated typing within debounce window', async () => {
      await typingManager.startTyping('user-1', 'channel-123');

      // Advance time but stay within debounce window
      await vi.advanceTimersByTimeAsync(2000);

      // Try to type again (should be debounced)
      await typingManager.startTyping('user-1', 'channel-123');

      // Advance past original TTL
      await vi.advanceTimersByTimeAsync(4000);

      // Should have stopped typing (original timeout fired)
      expect(mockRedis.sRem).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple timeouts for different user-channel combinations', async () => {
      await typingManager.startTyping('user-1', 'channel-123');
      await typingManager.startTyping('user-1', 'channel-456');
      await typingManager.startTyping('user-2', 'channel-123');

      // Advance time past TTL and run async timers
      await vi.advanceTimersByTimeAsync(5100);

      // All three should have stopped
      expect(mockRedis.sRem).toHaveBeenCalledTimes(3);
      expect(mockRedis.sRem).toHaveBeenCalledWith('typing:channel-123', 'user-1');
      expect(mockRedis.sRem).toHaveBeenCalledWith('typing:channel-456', 'user-1');
      expect(mockRedis.sRem).toHaveBeenCalledWith('typing:channel-123', 'user-2');
    });
  });
});
