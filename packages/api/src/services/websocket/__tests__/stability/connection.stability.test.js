import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { connectionManager } from '../../connection.manager';
import { heartbeatManager } from '../../heartbeat.manager';
describe('Connection Stability Tests', () => {
    let mockSocket;
    const testUserId = 'user-1';
    const testSocketId = 'socket-1';
    beforeEach(() => {
        vi.clearAllMocks();
        connectionManager.connections.clear();
        connectionManager.userConnections.clear();
        mockSocket = {
            id: testSocketId,
            data: { userId: testUserId },
            disconnect: vi.fn(),
            emit: vi.fn(),
            on: vi.fn().mockReturnThis(),
            off: vi.fn().mockReturnThis(),
            once: vi.fn().mockReturnThis(),
            removeListener: vi.fn().mockReturnThis(),
        };
    });
    afterEach(() => {
        vi.clearAllTimers();
    });
    describe('Reconnection Handling', () => {
        it('should handle rapid reconnection attempts', () => {
            connectionManager.addConnection(testSocketId, testUserId);
            expect(connectionManager.getConnection(testSocketId)).toBeDefined();
            connectionManager.removeConnection(testSocketId);
            expect(connectionManager.getConnection(testSocketId)).toBeUndefined();
            connectionManager.addConnection(testSocketId, testUserId);
            expect(connectionManager.getConnection(testSocketId)).toBeDefined();
        });
        it('should handle multiple reconnections from same user', () => {
            connectionManager.addConnection('socket-1', testUserId);
            connectionManager.addConnection('socket-2', testUserId);
            connectionManager.addConnection('socket-3', testUserId);
            const userConnections = connectionManager.getUserConnections(testUserId);
            expect(userConnections.length).toBe(3);
        });
        it('should clean up old connections when user reconnects', () => {
            connectionManager.addConnection('socket-1', testUserId);
            connectionManager.removeConnection('socket-1');
            connectionManager.addConnection('socket-2', testUserId);
            expect(connectionManager.getConnection('socket-1')).toBeUndefined();
            expect(connectionManager.getConnection('socket-2')).toBeDefined();
            expect(connectionManager.getUserConnections(testUserId).length).toBe(1);
        });
    });
    describe.skip('Heartbeat Mechanism', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });
        it('should track heartbeat with 25s interval', async () => {
            heartbeatManager.startHeartbeat(mockSocket);
            await vi.advanceTimersByTimeAsync(25000);
            expect(mockSocket.emit).toHaveBeenCalledWith('ping');
        });
        it('should timeout connection after 30s without pong', async () => {
            heartbeatManager.startHeartbeat(mockSocket);
            await vi.advanceTimersByTimeAsync(30000);
            expect(mockSocket.disconnect).toHaveBeenCalled();
        });
        it('should reset timeout when pong received', async () => {
            heartbeatManager.startHeartbeat(mockSocket);
            await vi.advanceTimersByTimeAsync(20000);
            heartbeatManager.handlePong(testSocketId);
            await vi.advanceTimersByTimeAsync(20000);
            expect(mockSocket.disconnect).not.toHaveBeenCalled();
        });
        it('should stop heartbeat on disconnect', () => {
            heartbeatManager.startHeartbeat(mockSocket);
            heartbeatManager.stopHeartbeat(testSocketId);
            const heartbeat = heartbeatManager.heartbeats.get(testSocketId);
            expect(heartbeat).toBeUndefined();
        });
    });
    describe('Concurrent Connections', () => {
        it('should handle maximum concurrent connections per user', () => {
            const maxConnections = 5;
            for (let i = 0; i < maxConnections; i++) {
                connectionManager.addConnection(`socket-${i}`, testUserId);
            }
            expect(connectionManager.getUserConnections(testUserId).length).toBe(maxConnections);
            expect(() => {
                connectionManager.addConnection('socket-extra', testUserId);
            }).toThrow('Per-user connection limit exceeded');
            expect(connectionManager.getUserConnections(testUserId).length).toBe(maxConnections);
        });
    });
});
//# sourceMappingURL=connection.stability.test.js.map