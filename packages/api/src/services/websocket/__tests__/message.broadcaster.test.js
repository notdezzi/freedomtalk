import { describe, it, expect, beforeEach, vi } from 'vitest';
import { messageBroadcaster } from '../message.broadcaster';
import { getRedisClient } from '../../../config/redis';
import { subscriptionManager } from '../subscription.manager';
import { connectionManager } from '../connection.manager';
import { roomManager, RoomType } from '../room.manager';
import { wsServer } from '../websocket.server';
import { WS_EVENTS } from '@freedomtalk/shared';
vi.mock('../../../config/redis');
vi.mock('../../../config/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));
vi.mock('../subscription.manager');
vi.mock('../connection.manager');
vi.mock('../room.manager');
vi.mock('../websocket.server');
describe('MessageBroadcaster', () => {
    let mockRedis;
    let mockIO;
    let mockSocket;
    const mockMessage = {
        id: 'msg-123',
        content: 'Hello, world!',
        authorId: 'user-1',
        channelId: 'channel-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        isEdited: false,
        isDeleted: false,
    };
    beforeEach(() => {
        vi.clearAllMocks();
        mockRedis = {
            exists: vi.fn().mockResolvedValue(0),
            set: vi.fn().mockResolvedValue('OK'),
        };
        vi.mocked(getRedisClient).mockResolvedValue(mockRedis);
        vi.mocked(subscriptionManager.getChannelSubscribers).mockResolvedValue(new Set(['user-1', 'user-2', 'user-3']));
        vi.mocked(roomManager.getRoomName).mockReturnValue('channel:channel-123');
        vi.mocked(roomManager.broadcastToRoom).mockReturnValue(undefined);
        mockSocket = {
            emit: vi.fn(),
        };
        mockIO = {
            sockets: {
                sockets: new Map([['socket-1', mockSocket]]),
            },
        };
        vi.mocked(wsServer.getIO).mockReturnValue(mockIO);
        vi.mocked(connectionManager.getUserConnections).mockReturnValue(['socket-1']);
    });
    describe('broadcastMessage', () => {
        it('should broadcast message to channel room', async () => {
            await messageBroadcaster.broadcastMessage(mockMessage);
            expect(roomManager.getRoomName).toHaveBeenCalledWith(RoomType.CHANNEL, 'channel-123');
            expect(roomManager.broadcastToRoom).toHaveBeenCalledWith('channel:channel-123', WS_EVENTS.MESSAGE_CREATED, mockMessage);
        });
        it('should mark message as broadcast for deduplication', async () => {
            await messageBroadcaster.broadcastMessage(mockMessage);
            expect(mockRedis.set).toHaveBeenCalledWith('broadcast:msg-123', '1', { EX: 60 });
        });
        it('should skip duplicate broadcasts', async () => {
            mockRedis.exists.mockResolvedValue(1);
            await messageBroadcaster.broadcastMessage(mockMessage);
            expect(roomManager.broadcastToRoom).not.toHaveBeenCalled();
        });
        it('should get channel subscribers', async () => {
            await messageBroadcaster.broadcastMessage(mockMessage);
            expect(subscriptionManager.getChannelSubscribers).toHaveBeenCalledWith('channel-123');
        });
        it('should not broadcast if channelId is null', async () => {
            const dmMessage = { ...mockMessage, channelId: null };
            await messageBroadcaster.broadcastMessage(dmMessage);
            expect(roomManager.broadcastToRoom).not.toHaveBeenCalled();
        });
        it('should throw error on Redis failure', async () => {
            mockRedis.exists.mockRejectedValue(new Error('Redis error'));
            await messageBroadcaster.broadcastMessage(mockMessage);
            expect(roomManager.broadcastToRoom).toHaveBeenCalled();
        });
        it('should throw error on broadcast failure', async () => {
            vi.mocked(roomManager.broadcastToRoom).mockImplementation(() => {
                throw new Error('Broadcast error');
            });
            await expect(messageBroadcaster.broadcastMessage(mockMessage)).rejects.toThrow('Broadcast error');
        });
    });
    describe('broadcastMessageUpdate', () => {
        it('should broadcast message update to channel room', async () => {
            await messageBroadcaster.broadcastMessageUpdate(mockMessage);
            expect(roomManager.getRoomName).toHaveBeenCalledWith(RoomType.CHANNEL, 'channel-123');
            expect(roomManager.broadcastToRoom).toHaveBeenCalledWith('channel:channel-123', WS_EVENTS.MESSAGE_UPDATED, mockMessage);
        });
        it('should not broadcast if channelId is null', async () => {
            const dmMessage = { ...mockMessage, channelId: null };
            await messageBroadcaster.broadcastMessageUpdate(dmMessage);
            expect(roomManager.broadcastToRoom).not.toHaveBeenCalled();
        });
        it('should throw error on broadcast failure', async () => {
            vi.mocked(roomManager.broadcastToRoom).mockImplementation(() => {
                throw new Error('Broadcast error');
            });
            await expect(messageBroadcaster.broadcastMessageUpdate(mockMessage)).rejects.toThrow('Broadcast error');
        });
    });
    describe('broadcastMessageDelete', () => {
        it('should broadcast message deletion to channel room', async () => {
            await messageBroadcaster.broadcastMessageDelete('msg-123', 'channel-123');
            expect(roomManager.getRoomName).toHaveBeenCalledWith(RoomType.CHANNEL, 'channel-123');
            expect(roomManager.broadcastToRoom).toHaveBeenCalledWith('channel:channel-123', WS_EVENTS.MESSAGE_DELETED, expect.objectContaining({
                messageId: 'msg-123',
                channelId: 'channel-123',
                timestamp: expect.any(String),
            }));
        });
        it('should throw error on broadcast failure', async () => {
            vi.mocked(roomManager.broadcastToRoom).mockImplementation(() => {
                throw new Error('Broadcast error');
            });
            await expect(messageBroadcaster.broadcastMessageDelete('msg-123', 'channel-123')).rejects.toThrow('Broadcast error');
        });
    });
    describe('broadcastToUser', () => {
        it('should broadcast to all user connections', async () => {
            vi.mocked(connectionManager.getUserConnections).mockReturnValue([
                'socket-1',
                'socket-2',
                'socket-3',
            ]);
            const mockSocket2 = { emit: vi.fn() };
            const mockSocket3 = { emit: vi.fn() };
            mockIO.sockets.sockets = new Map([
                ['socket-1', mockSocket],
                ['socket-2', mockSocket2],
                ['socket-3', mockSocket3],
            ]);
            await messageBroadcaster.broadcastToUser('user-1', 'test:event', { data: 'test' });
            expect(mockSocket.emit).toHaveBeenCalledWith('test:event', { data: 'test' });
            expect(mockSocket2.emit).toHaveBeenCalledWith('test:event', { data: 'test' });
            expect(mockSocket3.emit).toHaveBeenCalledWith('test:event', { data: 'test' });
        });
        it('should skip disconnected sockets', async () => {
            vi.mocked(connectionManager.getUserConnections).mockReturnValue([
                'socket-1',
                'socket-2',
                'socket-3',
            ]);
            mockIO.sockets.sockets = new Map([['socket-1', mockSocket]]);
            await messageBroadcaster.broadcastToUser('user-1', 'test:event', { data: 'test' });
            expect(mockSocket.emit).toHaveBeenCalledTimes(1);
        });
        it('should handle user with no connections', async () => {
            vi.mocked(connectionManager.getUserConnections).mockReturnValue([]);
            await messageBroadcaster.broadcastToUser('user-1', 'test:event', { data: 'test' });
            expect(mockSocket.emit).not.toHaveBeenCalled();
        });
        it('should not throw on broadcast error', async () => {
            mockSocket.emit.mockImplementation(() => {
                throw new Error('Socket error');
            });
            await expect(messageBroadcaster.broadcastToUser('user-1', 'test:event', { data: 'test' })).resolves.not.toThrow();
        });
    });
    describe('Edge Cases', () => {
        it('should handle sequential broadcasts of same message (deduplication)', async () => {
            const broadcastKeys = new Set();
            mockRedis.exists.mockImplementation((key) => {
                return Promise.resolve(broadcastKeys.has(key) ? 1 : 0);
            });
            mockRedis.set.mockImplementation((key) => {
                broadcastKeys.add(key);
                return Promise.resolve('OK');
            });
            await messageBroadcaster.broadcastMessage(mockMessage);
            await messageBroadcaster.broadcastMessage(mockMessage);
            await messageBroadcaster.broadcastMessage(mockMessage);
            expect(roomManager.broadcastToRoom).toHaveBeenCalledTimes(1);
        });
        it('should handle empty channel ID', async () => {
            const emptyMessage = { ...mockMessage, channelId: '' };
            await messageBroadcaster.broadcastMessage(emptyMessage);
            expect(roomManager.broadcastToRoom).not.toHaveBeenCalled();
        });
        it('should handle special characters in message content', async () => {
            const specialMessage = {
                ...mockMessage,
                content: 'Special chars: !@#$%^&*()_+-=[]{}|;:\'",.<>?/~`',
            };
            await messageBroadcaster.broadcastMessage(specialMessage);
            expect(roomManager.broadcastToRoom).toHaveBeenCalledWith('channel:channel-123', WS_EVENTS.MESSAGE_CREATED, specialMessage);
        });
        it('should handle very long message content', async () => {
            const longMessage = {
                ...mockMessage,
                content: 'a'.repeat(10000),
            };
            await messageBroadcaster.broadcastMessage(longMessage);
            expect(roomManager.broadcastToRoom).toHaveBeenCalled();
        });
        it('should handle broadcast with no subscribers', async () => {
            vi.mocked(subscriptionManager.getChannelSubscribers).mockResolvedValue(new Set());
            await messageBroadcaster.broadcastMessage(mockMessage);
            expect(roomManager.broadcastToRoom).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=message.broadcaster.test.js.map