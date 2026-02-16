/**
 * Connection Manager Tests
 *
 * Comprehensive tests for WebSocket connection tracking and limit enforcement.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { connectionManager } from '../connection.manager';
import { wsConfig } from '../../../config/websocket';

describe('ConnectionManager', () => {
  // Helper to clear all connections before each test
  beforeEach(() => {
    // Clear all connections by removing them one by one
    const allConnections = connectionManager.getAllConnections();
    allConnections.forEach((conn) => {
      connectionManager.removeConnection(conn.socketId);
    });
  });

  describe('addConnection', () => {
    it('should add a connection successfully', () => {
      const socketId = 'socket-1';
      const userId = 'user-1';

      connectionManager.addConnection(socketId, userId);

      const connection = connectionManager.getConnection(socketId);
      expect(connection).toBeDefined();
      expect(connection?.userId).toBe(userId);
      expect(connection?.socketId).toBe(socketId);
      expect(connection?.connectedAt).toBeInstanceOf(Date);
      expect(connection?.lastActivity).toBeInstanceOf(Date);
    });

    it('should track multiple connections for same user', () => {
      const userId = 'user-1';
      const socketId1 = 'socket-1';
      const socketId2 = 'socket-2';

      connectionManager.addConnection(socketId1, userId);
      connectionManager.addConnection(socketId2, userId);

      const userConnections = connectionManager.getUserConnections(userId);
      expect(userConnections).toHaveLength(2);
      expect(userConnections).toContain(socketId1);
      expect(userConnections).toContain(socketId2);
    });

    it('should increment connection count', () => {
      const initialCount = connectionManager.getConnectionCount();

      connectionManager.addConnection('socket-1', 'user-1');
      connectionManager.addConnection('socket-2', 'user-2');

      expect(connectionManager.getConnectionCount()).toBe(initialCount + 2);
    });

    it('should throw error when per-user limit exceeded', () => {
      const userId = 'user-1';
      const maxPerUser = wsConfig.maxConnectionsPerUser;

      // Add connections up to the limit
      for (let i = 0; i < maxPerUser; i++) {
        connectionManager.addConnection(`socket-${i}`, userId);
      }

      // Attempt to add one more connection
      expect(() => {
        connectionManager.addConnection(`socket-${maxPerUser}`, userId);
      }).toThrow(`Per-user connection limit exceeded (${maxPerUser})`);
    });

    it('should throw error when global limit exceeded', () => {
      // Mock config to use a smaller limit for testing
      const originalMax = wsConfig.maxConnections;
      (wsConfig as any).maxConnections = 3;

      try {
        // Add connections up to the limit
        for (let i = 0; i < 3; i++) {
          connectionManager.addConnection(`socket-${i}`, `user-${i}`);
        }

        // Attempt to add one more connection
        expect(() => {
          connectionManager.addConnection('socket-overflow', 'user-overflow');
        }).toThrow('Global connection limit exceeded (3)');
      } finally {
        // Restore original config
        (wsConfig as any).maxConnections = originalMax;
      }
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection successfully', () => {
      const socketId = 'socket-1';
      const userId = 'user-1';

      connectionManager.addConnection(socketId, userId);
      expect(connectionManager.getConnection(socketId)).toBeDefined();

      connectionManager.removeConnection(socketId);
      expect(connectionManager.getConnection(socketId)).toBeUndefined();
    });

    it('should decrement connection count', () => {
      connectionManager.addConnection('socket-1', 'user-1');
      const countBefore = connectionManager.getConnectionCount();

      connectionManager.removeConnection('socket-1');
      expect(connectionManager.getConnectionCount()).toBe(countBefore - 1);
    });

    it('should remove from user connections', () => {
      const userId = 'user-1';
      const socketId = 'socket-1';

      connectionManager.addConnection(socketId, userId);
      expect(connectionManager.getUserConnections(userId)).toContain(socketId);

      connectionManager.removeConnection(socketId);
      expect(connectionManager.getUserConnections(userId)).not.toContain(socketId);
    });

    it('should handle removing non-existent connection gracefully', () => {
      expect(() => {
        connectionManager.removeConnection('non-existent-socket');
      }).not.toThrow();
    });

    it('should clean up empty user connection sets', () => {
      const userId = 'user-1';
      const socketId = 'socket-1';

      connectionManager.addConnection(socketId, userId);
      connectionManager.removeConnection(socketId);

      const userConnections = connectionManager.getUserConnections(userId);
      expect(userConnections).toHaveLength(0);
    });
  });




  describe('getUserConnections', () => {
    it('should return all socket IDs for a user', () => {
      const userId = 'user-1';
      const socketIds = ['socket-1', 'socket-2', 'socket-3'];

      socketIds.forEach((socketId) => {
        connectionManager.addConnection(socketId, userId);
      });

      const userConnections = connectionManager.getUserConnections(userId);
      expect(userConnections).toHaveLength(3);
      socketIds.forEach((socketId) => {
        expect(userConnections).toContain(socketId);
      });
    });

    it('should return empty array for user with no connections', () => {
      const userConnections = connectionManager.getUserConnections('non-existent-user');
      expect(userConnections).toEqual([]);
    });
  });

  describe('getConnectionCount', () => {
    it('should return correct total connection count', () => {
      expect(connectionManager.getConnectionCount()).toBe(0);

      connectionManager.addConnection('socket-1', 'user-1');
      expect(connectionManager.getConnectionCount()).toBe(1);

      connectionManager.addConnection('socket-2', 'user-2');
      expect(connectionManager.getConnectionCount()).toBe(2);

      connectionManager.removeConnection('socket-1');
      expect(connectionManager.getConnectionCount()).toBe(1);
    });
  });

  describe('getUserConnectionCount', () => {
    it('should return correct count for user', () => {
      const userId = 'user-1';

      expect(connectionManager.getUserConnectionCount(userId)).toBe(0);

      connectionManager.addConnection('socket-1', userId);
      expect(connectionManager.getUserConnectionCount(userId)).toBe(1);

      connectionManager.addConnection('socket-2', userId);
      expect(connectionManager.getUserConnectionCount(userId)).toBe(2);

      connectionManager.removeConnection('socket-1');
      expect(connectionManager.getUserConnectionCount(userId)).toBe(1);
    });

    it('should return 0 for user with no connections', () => {
      expect(connectionManager.getUserConnectionCount('non-existent-user')).toBe(0);
    });
  });

  describe('updateActivity', () => {
    it('should update last activity timestamp', async () => {
      const socketId = 'socket-1';
      const userId = 'user-1';

      connectionManager.addConnection(socketId, userId);
      const connection1 = connectionManager.getConnection(socketId);
      const initialActivity = connection1?.lastActivity;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      connectionManager.updateActivity(socketId);
      const connection2 = connectionManager.getConnection(socketId);
      const updatedActivity = connection2?.lastActivity;

      expect(updatedActivity).toBeDefined();
      expect(updatedActivity!.getTime()).toBeGreaterThan(initialActivity!.getTime());
    });

    it('should handle updating non-existent connection gracefully', () => {
      expect(() => {
        connectionManager.updateActivity('non-existent-socket');
      }).not.toThrow();
    });
  });

  describe('getConnection', () => {
    it('should return connection metadata', () => {
      const socketId = 'socket-1';
      const userId = 'user-1';

      connectionManager.addConnection(socketId, userId);
      const connection = connectionManager.getConnection(socketId);

      expect(connection).toBeDefined();
      expect(connection?.userId).toBe(userId);
      expect(connection?.socketId).toBe(socketId);
    });

    it('should return undefined for non-existent connection', () => {
      const connection = connectionManager.getConnection('non-existent-socket');
      expect(connection).toBeUndefined();
    });
  });

  describe('getAllConnections', () => {
    it('should return all connection metadata', () => {
      connectionManager.addConnection('socket-1', 'user-1');
      connectionManager.addConnection('socket-2', 'user-2');
      connectionManager.addConnection('socket-3', 'user-1');

      const allConnections = connectionManager.getAllConnections();
      expect(allConnections).toHaveLength(3);
      expect(allConnections.every((conn) => conn.userId && conn.socketId)).toBe(true);
    });

    it('should return empty array when no connections', () => {
      const allConnections = connectionManager.getAllConnections();
      expect(allConnections).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid add/remove operations', () => {
      const userId = 'user-1';
      // Use 3 connections to stay well under the per-user limit of 5
      const socketIds = Array.from({ length: 3 }, (_, i) => `socket-${i}`);

      // Rapidly add connections
      socketIds.forEach((socketId) => {
        connectionManager.addConnection(socketId, userId);
      });

      expect(connectionManager.getUserConnectionCount(userId)).toBe(3);

      // Rapidly remove connections
      socketIds.forEach((socketId) => {
        connectionManager.removeConnection(socketId);
      });

      expect(connectionManager.getUserConnectionCount(userId)).toBe(0);
    });

    it('should maintain data integrity with multiple users', () => {
      const users = ['user-1', 'user-2', 'user-3'];
      const socketsPerUser = 3;

      users.forEach((userId, userIndex) => {
        for (let i = 0; i < socketsPerUser; i++) {
          connectionManager.addConnection(`socket-${userIndex}-${i}`, userId);
        }
      });

      // Verify each user has correct number of connections
      users.forEach((userId) => {
        expect(connectionManager.getUserConnectionCount(userId)).toBe(socketsPerUser);
      });

      // Verify total count
      expect(connectionManager.getConnectionCount()).toBe(users.length * socketsPerUser);
    });
  });
});
