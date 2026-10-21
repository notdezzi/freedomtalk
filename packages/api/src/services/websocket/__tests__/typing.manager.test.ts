import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { typingManager } from '../typing.manager';
import { getRedisClient } from '../../../config/redis';
import { roomManager } from '../room.manager';
import { wsServer } from '../websocket.server';
import { WS_EVENTS } from '@freedomtalk/shared';

// Mock dependencies
vi.mock('../../../config/redis');
vi.mock('../../../config/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
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
vi.mock('../websocket.server', () => ({
  wsServer: {
    getIO: vi.fn(),
  },
}));

describe('TypingManager', () => {
  let mockRedis: any;
  let mockIO: any;

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

    mockIO = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };
    vi.mocked(wsServer.getIO).mockReturnValue(mockIO as any);

    vi.mocked(roomManager.getRoomName).mockImplementation(
      (_type: string, id: string) => `channel:${id}`
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('startTyping', () => {
    it('should add user to typing set in Redis with TTL', async () => {
      await typingManager.startTyping('user-1', 'channel-123');

      expect(mockRedis.sAdd).toHaveBeenCalledWith('typing:channel:channel-123', 'user-1');
      expect(mockRedis.expire).toHaveBeenCalledWith('typing:channel:channel-123', 5);
    });

    it('should broadcast typing start event to the channel room', async () => {
      await typingManager.startTyping('user-1', 'channel-123');

      expect(roomManager.getRoomName).toHaveBeenCalledWith('channel', 'channel-123');
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

    it('should broadcast typing start to the DM room for DM channels', async () => {
      await typingManager.startTyping('user-1', 'dm-123', 'dm');

      expect(mockIO.to).toHaveBeenCalledWith('dm:dm-123');
      expect(mockIO.emit).toHaveBeenCalledWith(
        WS_EVENTS.TYPING_START,
        expect.objectContaining({
          userId: 'user-1',
          dmChannelId: 'dm-123',
          timestamp: expect.any(String),
        })
      );
    });

    it('should debounce rapid typing events', async () => {
      await typingManager.startTyping('user-1', 'channel-123');
      await typingManager.startTyping('user-1', 'channel-123');
      await typingManager.startTyping('user-1', 'channel-123');

      expect(roomManager.broadcastToRoom).toHaveBeenCalledTimes(1);
    });

    it('should re-broadcast after the debounce window elapses', async () => {
      await typingManager.startTyping('user-1', 'channel-123');
      await vi.advanceTimersByTimeAsync(4000);
      await typingManager.startTyping('user-1', 'channel-123');

      expect(roomManager.broadcastToRoom).toHaveBeenCalledTimes(2);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.sAdd.mockRejectedValue(new Error('Redis error'));

      await expect(typingManager.startTyping('user-1', 'channel-123')).resolves.not.toThrow();
    });

    it('should handle special characters in IDs', async () => {
      const specialUserId = 'user_!@#$';
      const specialChannelId = 'channel_!@#$';

      await typingManager.startTyping(specialUserId, specialChannelId);

      expect(mockRedis.sAdd).toHaveBeenCalledWith(
        `typing:channel:${specialChannelId}`,
        specialUserId
      );
    });
  });

  describe('stopTyping', () => {
    it('should remove user from the typing set in Redis', async () => {
      await typingManager.stopTyping('user-1', 'channel-123');

      expect(mockRedis.sRem).toHaveBeenCalledWith('typing:channel:channel-123', 'user-1');
    });

    it('should broadcast typing stop event to the channel room', async () => {
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

    it('should broadcast typing stop to the DM room for DM channels', async () => {
      await typingManager.stopTyping('user-1', 'dm-123', 'dm');

      expect(mockIO.to).toHaveBeenCalledWith('dm:dm-123');
      expect(mockIO.emit).toHaveBeenCalledWith(
        WS_EVENTS.TYPING_STOP,
        expect.objectContaining({
          userId: 'user-1',
          dmChannelId: 'dm-123',
        })
      );
    });

    it('should clear the auto-timeout when typing stops', async () => {
      await typingManager.startTyping('user-1', 'channel-123');
      await typingManager.stopTyping('user-1', 'channel-123');

      expect((typingManager as any).typingTimeouts.size).toBe(0);
    });
  });

  describe('getTypingUsers', () => {
    it('should return the set of typing users from Redis', async () => {
      mockRedis.sMembers.mockResolvedValue(['user-1', 'user-2']);

      const users = await typingManager.getTypingUsers('channel-123');

      expect(mockRedis.sMembers).toHaveBeenCalledWith('typing:channel:channel-123');
      expect(users).toEqual(new Set(['user-1', 'user-2']));
    });

    it('should use the DM key format for DM channels', async () => {
      await typingManager.getTypingUsers('dm-123', 'dm');
      expect(mockRedis.sMembers).toHaveBeenCalledWith('typing:dm:dm-123');
    });

    it('should return an empty set on Redis errors', async () => {
      mockRedis.sMembers.mockRejectedValue(new Error('Redis error'));

      const users = await typingManager.getTypingUsers('channel-123');
      expect(users.size).toBe(0);
    });
  });

  describe('typing timeout', () => {
    it('should auto-clear typing state after the TTL', async () => {
      await typingManager.startTyping('user-1', 'channel-123');

      // Advance past the auto-timeout
      await vi.advanceTimersByTimeAsync(6000);

      expect(mockRedis.sRem).toHaveBeenCalledWith('typing:channel:channel-123', 'user-1');
    });

    it('should handle multiple timeouts for different user-channel combinations', async () => {
      await typingManager.startTyping('user-1', 'channel-123');
      await typingManager.startTyping('user-1', 'channel-456');
      await typingManager.startTyping('user-2', 'channel-123');

      // Advance time past TTL and run async timers
      await vi.advanceTimersByTimeAsync(6000);

      expect(mockRedis.sRem).toHaveBeenCalledWith('typing:channel:channel-123', 'user-1');
      expect(mockRedis.sRem).toHaveBeenCalledWith('typing:channel:channel-456', 'user-1');
      expect(mockRedis.sRem).toHaveBeenCalledWith('typing:channel:channel-123', 'user-2');
    });
  });
});
