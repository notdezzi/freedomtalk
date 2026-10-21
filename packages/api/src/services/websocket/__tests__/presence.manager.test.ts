import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { presenceManager } from '../presence.manager';
import { getRedisClient } from '../../../config/redis';
import { wsServer } from '../websocket.server';
import { dmChannelService } from '../../dm/dm-channel.service';
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
vi.mock('../websocket.server', () => ({
  wsServer: {
    getIO: vi.fn(),
  },
}));
vi.mock('../../dm/dm-channel.service', () => ({
  dmChannelService: {
    getDMsByUser: vi.fn().mockResolvedValue({ dmChannels: [], total: 0 }),
  },
}));
vi.mock('../../../config/database', () => ({
  db: vi.fn().mockReturnThis(),
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

    // Create mock Socket.io server: io.to(room).emit(...)
    mockIO = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };

    vi.mocked(wsServer.getIO).mockReturnValue(mockIO as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('setOnline', () => {
    it('should set user as online in Redis with a 30s TTL', async () => {
      await presenceManager.setOnline('user-1');

      expect(mockRedis.set).toHaveBeenCalledWith('presence:user-1', 'online', { EX: 30 });
    });

    it('should broadcast presence update to DM rooms the user participates in', async () => {
      vi.mocked(dmChannelService.getDMsByUser).mockResolvedValue({
        dmChannels: [{ id: 'dm-1' }, { id: 'dm-2' }],
        total: 2,
      } as any);

      // Distinct user ID: broadcasts are throttled per user at module level
      await presenceManager.setOnline('user-dm-broadcast');

      expect(mockIO.to).toHaveBeenCalledWith('dm:dm-1');
      expect(mockIO.to).toHaveBeenCalledWith('dm:dm-2');
      expect(mockIO.emit).toHaveBeenCalledWith(
        WS_EVENTS.PRESENCE_UPDATE,
        expect.objectContaining({
          userId: 'user-dm-broadcast',
          presence: 'online',
          timestamp: expect.any(String),
        })
      );
    });

    it('should not broadcast when the user has no DM channels or friends', async () => {
      await presenceManager.setOnline('user-1');

      expect(mockIO.emit).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'));

      await expect(presenceManager.setOnline('user-1')).resolves.not.toThrow();
    });
  });

  describe('setOffline', () => {
    it('should delete the presence key in Redis', async () => {
      await presenceManager.setOffline('user-1');

      expect(mockRedis.del).toHaveBeenCalledWith('presence:user-1');
    });

    it('should broadcast offline presence to DM rooms', async () => {
      vi.mocked(dmChannelService.getDMsByUser).mockResolvedValue({
        dmChannels: [{ id: 'dm-1' }],
        total: 1,
      } as any);

      await presenceManager.setOffline('user-1');

      expect(mockIO.emit).toHaveBeenCalledWith(
        WS_EVENTS.PRESENCE_UPDATE,
        expect.objectContaining({
          userId: 'user-1',
          presence: 'offline',
        })
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      await expect(presenceManager.setOffline('user-1')).resolves.not.toThrow();
    });
  });

  describe('getPresence', () => {
    it('should return online when the presence key exists', async () => {
      mockRedis.get.mockResolvedValue('online');

      const presence = await presenceManager.getPresence('user-1');

      expect(mockRedis.get).toHaveBeenCalledWith('presence:user-1');
      expect(presence).toBe('online');
    });

    it('should return offline when the presence key is missing', async () => {
      mockRedis.get.mockResolvedValue(null);

      const presence = await presenceManager.getPresence('user-1');
      expect(presence).toBe('offline');
    });

    it('should return offline on Redis errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const presence = await presenceManager.getPresence('user-1');
      expect(presence).toBe('offline');
    });
  });

  describe('refreshPresence', () => {
    it('should extend the TTL when the user is already online', async () => {
      mockRedis.exists.mockResolvedValue(1);

      await presenceManager.refreshPresence('user-1');

      expect(mockRedis.expire).toHaveBeenCalledWith('presence:user-1', 30);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should set the user online when the presence key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      await presenceManager.refreshPresence('user-1');

      expect(mockRedis.set).toHaveBeenCalledWith('presence:user-1', 'online', { EX: 30 });
    });

    it('should handle presence refresh for non-existent user', async () => {
      mockRedis.exists.mockResolvedValue(0);

      await presenceManager.refreshPresence('non-existent-user');

      expect(mockRedis.set).toHaveBeenCalledWith('presence:non-existent-user', 'online', {
        EX: 30,
      });
    });
  });

  describe('getBulkPresence', () => {
    it('should map each user via a single mGet', async () => {
      mockRedis.mGet.mockResolvedValue(['online', null, 'online']);

      const result = await presenceManager.getBulkPresence(['u1', 'u2', 'u3']);

      expect(mockRedis.mGet).toHaveBeenCalledWith(['presence:u1', 'presence:u2', 'presence:u3']);
      expect(result.get('u1')).toBe('online');
      expect(result.get('u2')).toBe('offline');
      expect(result.get('u3')).toBe('online');
    });

    it('should return all offline on Redis errors', async () => {
      mockRedis.mGet.mockRejectedValue(new Error('Redis error'));

      const result = await presenceManager.getBulkPresence(['u1', 'u2']);
      expect(result.get('u1')).toBe('offline');
      expect(result.get('u2')).toBe('offline');
    });

    it('should handle an empty user list', async () => {
      const result = await presenceManager.getBulkPresence([]);
      expect(result.size).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty user ID', async () => {
      await presenceManager.setOnline('');

      expect(mockRedis.set).toHaveBeenCalledWith('presence:', 'online', { EX: 30 });
    });

    it('should handle special characters in user ID', async () => {
      const specialUserId = 'user_!@#';

      await presenceManager.setOnline(specialUserId);

      expect(mockRedis.set).toHaveBeenCalledWith(`presence:${specialUserId}`, 'online', {
        EX: 30,
      });
    });
  });
});
