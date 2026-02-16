import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { presenceManager } from '../presence.manager';
import { getRedisClient } from '../../../config/redis';
import { wsServer } from '../websocket.server';
import { WS_EVENTS } from '@freedomtalk/shared';

// Mock dependencies
vi.mock('../../../config/redis');
vi.mock('../../../config/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('../websocket.server', () => ({
  wsServer: {
    getIO: vi.fn(),
  },
}));

describe('PresenceManager', () => {
  let mockRedis: any;
  let mockIO: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Redis client
    mockRedis = {
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(0),
      expire: vi.fn().mockResolvedValue(1),
      mGet: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(getRedisClient).mockResolvedValue(mockRedis);

    // Create mock Socket.io server
    mockIO = {
      emit: vi.fn(),
    };

    vi.mocked(wsServer.getIO).mockReturnValue(mockIO as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('setOnline', () => {
    it('should set user as online in Redis with TTL', async () => {
      await presenceManager.setOnline('user-1');

      expect(mockRedis.set).toHaveBeenCalledWith('presence:user-1', 'online', { EX: 60 });
    });

    it('should broadcast presence update when user goes online', async () => {
      await presenceManager.setOnline('user-1');

      expect(mockIO.emit).toHaveBeenCalledWith(
        WS_EVENTS.PRESENCE_UPDATE,
        expect.objectContaining({
          userId: 'user-1',
          presence: 'online',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(presenceManager.setOnline('user-1')).resolves.not.toThrow();
    });

    it('should handle broadcast errors gracefully', async () => {
      mockIO.emit.mockImplementation(() => {
        throw new Error('Broadcast error');
      });

      // Should not throw
      await expect(presenceManager.setOnline('user-1')).resolves.not.toThrow();
    });
  });

  describe('setOffline', () => {
    it('should delete presence key from Redis', async () => {
      await presenceManager.setOffline('user-1');

      expect(mockRedis.del).toHaveBeenCalledWith('presence:user-1');
    });

    it('should broadcast presence update when user goes offline', async () => {
      await presenceManager.setOffline('user-1');

      expect(mockIO.emit).toHaveBeenCalledWith(
        WS_EVENTS.PRESENCE_UPDATE,
        expect.objectContaining({
          userId: 'user-1',
          presence: 'offline',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(presenceManager.setOffline('user-1')).resolves.not.toThrow();
    });
  });

  describe('getPresence', () => {
    it('should return online when user is online', async () => {
      mockRedis.get.mockResolvedValue('online');

      const presence = await presenceManager.getPresence('user-1');

      expect(mockRedis.get).toHaveBeenCalledWith('presence:user-1');
      expect(presence).toBe('online');
    });

    it('should return offline when user is not in Redis', async () => {
      mockRedis.get.mockResolvedValue(null);

      const presence = await presenceManager.getPresence('user-1');

      expect(presence).toBe('offline');
    });

    it('should return offline when Redis value is invalid', async () => {
      mockRedis.get.mockResolvedValue('invalid-status');

      const presence = await presenceManager.getPresence('user-1');

      expect(presence).toBe('offline');
    });

    it('should return offline on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const presence = await presenceManager.getPresence('user-1');

      expect(presence).toBe('offline');
    });
  });

  describe('refreshPresence', () => {
    it('should extend TTL when user is already online', async () => {
      mockRedis.exists.mockResolvedValue(1);

      await presenceManager.refreshPresence('user-1');

      expect(mockRedis.exists).toHaveBeenCalledWith('presence:user-1');
      expect(mockRedis.expire).toHaveBeenCalledWith('presence:user-1', 60);
    });

    it('should set user online when presence key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      await presenceManager.refreshPresence('user-1');

      expect(mockRedis.exists).toHaveBeenCalledWith('presence:user-1');
      expect(mockRedis.set).toHaveBeenCalledWith('presence:user-1', 'online', { EX: 60 });
      expect(mockIO.emit).toHaveBeenCalledWith(
        WS_EVENTS.PRESENCE_UPDATE,
        expect.objectContaining({
          userId: 'user-1',
          presence: 'online',
        })
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(presenceManager.refreshPresence('user-1')).resolves.not.toThrow();
    });
  });

  describe('getBulkPresence', () => {
    it('should return presence for multiple users', async () => {
      mockRedis.mGet.mockResolvedValue(['online', null, 'online']);

      const presenceMap = await presenceManager.getBulkPresence(['user-1', 'user-2', 'user-3']);

      expect(mockRedis.mGet).toHaveBeenCalledWith([
        'presence:user-1',
        'presence:user-2',
        'presence:user-3',
      ]);
      expect(presenceMap.size).toBe(3);
      expect(presenceMap.get('user-1')).toBe('online');
      expect(presenceMap.get('user-2')).toBe('offline');
      expect(presenceMap.get('user-3')).toBe('online');
    });

    it('should return empty map for empty user list', async () => {
      const presenceMap = await presenceManager.getBulkPresence([]);

      expect(presenceMap.size).toBe(0);
    });

    it('should return all offline on Redis error', async () => {
      mockRedis.mGet.mockRejectedValue(new Error('Redis error'));

      const presenceMap = await presenceManager.getBulkPresence(['user-1', 'user-2']);

      expect(presenceMap.size).toBe(2);
      expect(presenceMap.get('user-1')).toBe('offline');
      expect(presenceMap.get('user-2')).toBe('offline');
    });

    it('should handle large batch of users', async () => {
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);
      const values = Array.from({ length: 100 }, (_, i) => (i % 2 === 0 ? 'online' : null));
      mockRedis.mGet.mockResolvedValue(values);

      const presenceMap = await presenceManager.getBulkPresence(userIds);

      expect(presenceMap.size).toBe(100);
      expect(presenceMap.get('user-0')).toBe('online');
      expect(presenceMap.get('user-1')).toBe('offline');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid online/offline transitions', async () => {
      await presenceManager.setOnline('user-1');
      await presenceManager.setOffline('user-1');
      await presenceManager.setOnline('user-1');

      expect(mockRedis.set).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledTimes(1);
      expect(mockIO.emit).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent presence updates for different users', async () => {
      await Promise.all([
        presenceManager.setOnline('user-1'),
        presenceManager.setOnline('user-2'),
        presenceManager.setOnline('user-3'),
      ]);

      expect(mockRedis.set).toHaveBeenCalledTimes(3);
      expect(mockIO.emit).toHaveBeenCalledTimes(3);
    });

    it('should handle presence refresh for non-existent user', async () => {
      mockRedis.exists.mockResolvedValue(0);

      await presenceManager.refreshPresence('non-existent-user');

      expect(mockRedis.set).toHaveBeenCalledWith('presence:non-existent-user', 'online', {
        EX: 60,
      });
    });

    it('should handle empty user ID', async () => {
      await presenceManager.setOnline('');

      expect(mockRedis.set).toHaveBeenCalledWith('presence:', 'online', { EX: 60 });
    });

    it('should handle special characters in user ID', async () => {
      const specialUserId = 'user-!@#$%^&*()';

      await presenceManager.setOnline(specialUserId);

      expect(mockRedis.set).toHaveBeenCalledWith(`presence:${specialUserId}`, 'online', {
        EX: 60,
      });
    });
  });
});
