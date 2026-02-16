import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Socket } from 'socket.io';
import { roomManager, RoomType } from '../room.manager';
import { getRedisClient } from '../../../config/redis';
import { wsServer } from '../websocket.server';

// Mock dependencies
vi.mock('../../../config/redis');
vi.mock('../../../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock('../websocket.server', () => ({
  wsServer: {
    getIO: vi.fn(),
  },
}));

describe('RoomManager', () => {
  let mockSocket: Partial<Socket>;
  let mockRedis: any;
  let mockIO: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock Redis client
    mockRedis = {
      sAdd: vi.fn().mockResolvedValue(1),
      sRem: vi.fn().mockResolvedValue(1),
      sMembers: vi.fn().mockResolvedValue([]),
      sIsMember: vi.fn().mockResolvedValue(false),
      sCard: vi.fn().mockResolvedValue(0),
      expire: vi.fn().mockResolvedValue(1),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(getRedisClient).mockResolvedValue(mockRedis);

    // Create mock Socket.io server
    mockIO = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };

    vi.mocked(wsServer.getIO).mockReturnValue(mockIO as any);

    // Create mock socket
    mockSocket = {
      id: 'test-socket-id',
      data: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: true,
          mfaEnabled: false,
          accountStatus: 'active',
        },
      },
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getRoomName', () => {
    it('should generate correct room name for channel', () => {
      const roomName = roomManager.getRoomName(RoomType.CHANNEL, 'channel-123');
      expect(roomName).toBe('channel:channel-123');
    });

    it('should generate correct room name for server', () => {
      const roomName = roomManager.getRoomName(RoomType.SERVER, 'server-456');
      expect(roomName).toBe('server:server-456');
    });

    it('should generate correct room name for DM', () => {
      const roomName = roomManager.getRoomName(RoomType.DM, 'dm-789');
      expect(roomName).toBe('dm:dm-789');
    });
  });

  describe('joinRoom', () => {
    it('should successfully join a channel room', async () => {
      await roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123');

      expect(mockSocket.join).toHaveBeenCalledWith('channel:channel-123');
      expect(mockRedis.sAdd).toHaveBeenCalledWith('room:channel:channel-123', 'user-1');
      expect(mockRedis.expire).toHaveBeenCalledWith('room:channel:channel-123', 3600);
    });

    it('should successfully join a server room', async () => {
      await roomManager.joinRoom(mockSocket as Socket, RoomType.SERVER, 'server-456');

      expect(mockSocket.join).toHaveBeenCalledWith('server:server-456');
      expect(mockRedis.sAdd).toHaveBeenCalledWith('room:server:server-456', 'user-1');
      expect(mockRedis.expire).toHaveBeenCalledWith('room:server:server-456', 3600);
    });

    it('should successfully join a DM room', async () => {
      await roomManager.joinRoom(mockSocket as Socket, RoomType.DM, 'dm-789');

      expect(mockSocket.join).toHaveBeenCalledWith('dm:dm-789');
      expect(mockRedis.sAdd).toHaveBeenCalledWith('room:dm:dm-789', 'user-1');
      expect(mockRedis.expire).toHaveBeenCalledWith('room:dm:dm-789', 3600);
    });

    it('should throw error when user is not authenticated', async () => {
      mockSocket.data = {};

      await expect(
        roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123')
      ).rejects.toThrow('User not authenticated');

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockRedis.sAdd).not.toHaveBeenCalled();
    });

    it('should throw error when socket.join fails', async () => {
      mockSocket.join = vi.fn().mockRejectedValue(new Error('Socket.io error'));

      await expect(
        roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123')
      ).rejects.toThrow('Socket.io error');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.sAdd.mockRejectedValue(new Error('Redis error'));

      // Should not throw, but log error
      await roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123');

      expect(mockSocket.join).toHaveBeenCalled();
    });
  });

  describe('broadcastToRoom', () => {
    it('should broadcast event to room', () => {
      roomManager.broadcastToRoom('channel:channel-123', 'message:created', { id: 'msg-1' });

      expect(mockIO.to).toHaveBeenCalledWith('channel:channel-123');
      expect(mockIO.emit).toHaveBeenCalledWith('message:created', { id: 'msg-1' });
    });

    it('should broadcast to server room', () => {
      roomManager.broadcastToRoom('server:server-456', 'user:joined', { userId: 'user-1' });

      expect(mockIO.to).toHaveBeenCalledWith('server:server-456');
      expect(mockIO.emit).toHaveBeenCalledWith('user:joined', { userId: 'user-1' });
    });

    it('should broadcast to DM room', () => {
      roomManager.broadcastToRoom('dm:dm-789', 'typing:start', { userId: 'user-1' });

      expect(mockIO.to).toHaveBeenCalledWith('dm:dm-789');
      expect(mockIO.emit).toHaveBeenCalledWith('typing:start', { userId: 'user-1' });
    });

    it('should handle broadcast errors gracefully', () => {
      mockIO.to.mockImplementation(() => {
        throw new Error('Broadcast error');
      });

      // Should not throw
      expect(() => {
        roomManager.broadcastToRoom('channel:channel-123', 'test:event', {});
      }).not.toThrow();
    });

    it('should broadcast with null data', () => {
      roomManager.broadcastToRoom('channel:channel-123', 'test:event', null);

      expect(mockIO.to).toHaveBeenCalledWith('channel:channel-123');
      expect(mockIO.emit).toHaveBeenCalledWith('test:event', null);
    });

    it('should broadcast with complex data structures', () => {
      const complexData = {
        message: { id: 'msg-1', content: 'Hello', author: { id: 'user-1', name: 'Test' } },
        metadata: { timestamp: Date.now(), edited: false },
      };

      roomManager.broadcastToRoom('channel:channel-123', 'message:created', complexData);

      expect(mockIO.emit).toHaveBeenCalledWith('message:created', complexData);
    });
  });

  describe('Edge Cases and Concurrent Operations', () => {
    it('should handle joining same room multiple times', async () => {
      await roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123');
      await roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123');

      // Socket.io join should be called twice
      expect(mockSocket.join).toHaveBeenCalledTimes(2);
      // Redis sAdd should be called twice (Redis handles duplicates)
      expect(mockRedis.sAdd).toHaveBeenCalledTimes(2);
    });

    it('should handle leaving room not joined', async () => {
      // Should not throw
      await roomManager.leaveRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123');

      expect(mockSocket.leave).toHaveBeenCalled();
      expect(mockRedis.sRem).toHaveBeenCalled();
    });

    it('should handle concurrent join operations', async () => {
      const promises = [
        roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-1'),
        roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-2'),
        roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-3'),
      ];

      await Promise.all(promises);

      expect(mockSocket.join).toHaveBeenCalledTimes(3);
      expect(mockRedis.sAdd).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent leave operations', async () => {
      const promises = [
        roomManager.leaveRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-1'),
        roomManager.leaveRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-2'),
        roomManager.leaveRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-3'),
      ];

      await Promise.all(promises);

      expect(mockSocket.leave).toHaveBeenCalledTimes(3);
      expect(mockRedis.sRem).toHaveBeenCalledTimes(3);
    });

    it('should handle room names with special characters', async () => {
      const specialRoomId = 'room-with-special-chars-!@#$%';

      await roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, specialRoomId);

      expect(mockSocket.join).toHaveBeenCalledWith(`channel:${specialRoomId}`);
    });

    it('should handle very long room IDs', async () => {
      const longRoomId = 'a'.repeat(1000);

      await roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, longRoomId);

      expect(mockSocket.join).toHaveBeenCalledWith(`channel:${longRoomId}`);
    });

    it('should handle empty room ID', async () => {
      await roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, '');

      expect(mockSocket.join).toHaveBeenCalledWith('channel:');
    });

    it('should maintain separate membership for different room types with same ID', async () => {
      const roomId = 'same-id';

      await roomManager.joinRoom(mockSocket as Socket, RoomType.CHANNEL, roomId);
      await roomManager.joinRoom(mockSocket as Socket, RoomType.SERVER, roomId);
      await roomManager.joinRoom(mockSocket as Socket, RoomType.DM, roomId);

      expect(mockSocket.join).toHaveBeenCalledWith('channel:same-id');
      expect(mockSocket.join).toHaveBeenCalledWith('server:same-id');
      expect(mockSocket.join).toHaveBeenCalledWith('dm:same-id');
      expect(mockRedis.sAdd).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple users in same room', async () => {
      mockRedis.sMembers.mockResolvedValue(['user-1', 'user-2', 'user-3', 'user-4', 'user-5']);

      const members = await roomManager.getRoomMembers('channel:channel-123');

      expect(members.size).toBe(5);
    });

    it('should properly clean up when last user leaves', async () => {
      mockRedis.sCard.mockResolvedValue(0);

      await roomManager.leaveRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123');

      expect(mockRedis.del).toHaveBeenCalledWith('room:channel:channel-123');
    });
  });

  describe('leaveRoom', () => {
    it('should successfully leave a channel room', async () => {
      await roomManager.leaveRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123');

      expect(mockSocket.leave).toHaveBeenCalledWith('channel:channel-123');
      expect(mockRedis.sRem).toHaveBeenCalledWith('room:channel:channel-123', 'user-1');
    });

    it('should successfully leave a server room', async () => {
      await roomManager.leaveRoom(mockSocket as Socket, RoomType.SERVER, 'server-456');

      expect(mockSocket.leave).toHaveBeenCalledWith('server:server-456');
      expect(mockRedis.sRem).toHaveBeenCalledWith('room:server:server-456', 'user-1');
    });

    it('should successfully leave a DM room', async () => {
      await roomManager.leaveRoom(mockSocket as Socket, RoomType.DM, 'dm-789');

      expect(mockSocket.leave).toHaveBeenCalledWith('dm:dm-789');
      expect(mockRedis.sRem).toHaveBeenCalledWith('room:dm:dm-789', 'user-1');
    });

    it('should throw error when user is not authenticated', async () => {
      mockSocket.data = {};

      await expect(
        roomManager.leaveRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123')
      ).rejects.toThrow('User not authenticated');

      expect(mockSocket.leave).not.toHaveBeenCalled();
      expect(mockRedis.sRem).not.toHaveBeenCalled();
    });

    it('should clean up empty rooms', async () => {
      mockRedis.sCard.mockResolvedValue(0);

      await roomManager.leaveRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123');

      expect(mockRedis.sCard).toHaveBeenCalledWith('room:channel:channel-123');
      expect(mockRedis.del).toHaveBeenCalledWith('room:channel:channel-123');
    });

    it('should not delete room if members remain', async () => {
      mockRedis.sCard.mockResolvedValue(2);

      await roomManager.leaveRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123');

      expect(mockRedis.sCard).toHaveBeenCalledWith('room:channel:channel-123');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should throw error when socket.leave fails', async () => {
      mockSocket.leave = vi.fn().mockRejectedValue(new Error('Socket.io error'));

      await expect(
        roomManager.leaveRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123')
      ).rejects.toThrow('Socket.io error');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.sRem.mockRejectedValue(new Error('Redis error'));

      // Should not throw, but log error
      await roomManager.leaveRoom(mockSocket as Socket, RoomType.CHANNEL, 'channel-123');

      expect(mockSocket.leave).toHaveBeenCalled();
    });
  });

  describe('getRoomMembers', () => {
    it('should return set of user IDs in a room', async () => {
      mockRedis.sMembers.mockResolvedValue(['user-1', 'user-2', 'user-3']);

      const members = await roomManager.getRoomMembers('channel:channel-123');

      expect(mockRedis.sMembers).toHaveBeenCalledWith('room:channel:channel-123');
      expect(members).toBeInstanceOf(Set);
      expect(members.size).toBe(3);
      expect(members.has('user-1')).toBe(true);
      expect(members.has('user-2')).toBe(true);
      expect(members.has('user-3')).toBe(true);
    });

    it('should return empty set for room with no members', async () => {
      mockRedis.sMembers.mockResolvedValue([]);

      const members = await roomManager.getRoomMembers('channel:channel-123');

      expect(members).toBeInstanceOf(Set);
      expect(members.size).toBe(0);
    });

    it('should return empty set on Redis error', async () => {
      mockRedis.sMembers.mockRejectedValue(new Error('Redis error'));

      const members = await roomManager.getRoomMembers('channel:channel-123');

      expect(members).toBeInstanceOf(Set);
      expect(members.size).toBe(0);
    });

    it('should handle duplicate user IDs correctly', async () => {
      // Redis shouldn't return duplicates, but test Set behavior
      mockRedis.sMembers.mockResolvedValue(['user-1', 'user-1', 'user-2']);

      const members = await roomManager.getRoomMembers('channel:channel-123');

      expect(members.size).toBe(2); // Set removes duplicates
      expect(members.has('user-1')).toBe(true);
      expect(members.has('user-2')).toBe(true);
    });
  });

  describe('getUserRooms', () => {
    it('should return all rooms a user is in', async () => {
      mockRedis.keys.mockResolvedValue([
        'room:channel:channel-123',
        'room:server:server-456',
        'room:dm:dm-789',
      ]);
      mockRedis.sIsMember.mockImplementation((key: string, userId: string) => {
        if (key === 'room:channel:channel-123' && userId === 'user-1') return Promise.resolve(true);
        if (key === 'room:server:server-456' && userId === 'user-1') return Promise.resolve(true);
        return Promise.resolve(false);
      });

      const rooms = await roomManager.getUserRooms('user-1');

      expect(mockRedis.keys).toHaveBeenCalledWith('room:*');
      expect(rooms).toHaveLength(2);
      expect(rooms).toContain('channel:channel-123');
      expect(rooms).toContain('server:server-456');
      expect(rooms).not.toContain('dm:dm-789');
    });

    it('should return empty array when user is in no rooms', async () => {
      mockRedis.keys.mockResolvedValue(['room:channel:channel-123']);
      mockRedis.sIsMember.mockResolvedValue(false);

      const rooms = await roomManager.getUserRooms('user-1');

      expect(rooms).toEqual([]);
    });

    it('should return empty array when no rooms exist', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const rooms = await roomManager.getUserRooms('user-1');

      expect(rooms).toEqual([]);
    });

    it('should return empty array on Redis error', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const rooms = await roomManager.getUserRooms('user-1');

      expect(rooms).toEqual([]);
    });
  });
});