import { describe, it, expect, beforeEach, vi } from 'vitest';
import { messageRouter } from '../message.router';
import { messageBroadcaster } from '../message.broadcaster';
import { subscriptionManager } from '../subscription.manager';
vi.mock('../../../config/database', () => ({
    db: vi.fn(),
}));
vi.mock('../../../config/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));
vi.mock('../message.broadcaster');
vi.mock('../subscription.manager');
describe('MessageRouter', () => {
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
        vi.mocked(subscriptionManager.isSubscribed).mockResolvedValue(true);
        vi.mocked(subscriptionManager.getChannelSubscribers).mockResolvedValue(new Set(['user-1', 'user-2', 'user-3']));
        vi.mocked(messageBroadcaster.broadcastMessage).mockResolvedValue(undefined);
        vi.mocked(messageBroadcaster.broadcastToUser).mockResolvedValue(undefined);
    });
    describe('routeMessage', () => {
        it('should route channel message when channelId is present', async () => {
            await messageRouter.routeMessage(mockMessage);
            expect(subscriptionManager.isSubscribed).toHaveBeenCalledWith('user-1', 'channel-123');
            expect(messageBroadcaster.broadcastMessage).toHaveBeenCalledWith(mockMessage);
        });
        it('should route DM when channelId is null', async () => {
            const dmMessage = { ...mockMessage, channelId: null };
            await messageRouter.routeMessage(dmMessage);
            expect(messageBroadcaster.broadcastToUser).toHaveBeenCalledWith('user-1', 'message:created', dmMessage);
        });
        it('should throw error on routing failure', async () => {
            vi.mocked(messageBroadcaster.broadcastMessage).mockRejectedValue(new Error('Broadcast error'));
            await expect(messageRouter.routeMessage(mockMessage)).rejects.toThrow('Broadcast error');
        });
    });
    describe('routeChannelMessage', () => {
        it('should validate author subscription', async () => {
            await messageRouter.routeChannelMessage(mockMessage);
            expect(subscriptionManager.isSubscribed).toHaveBeenCalledWith('user-1', 'channel-123');
        });
        it('should get channel subscribers', async () => {
            await messageRouter.routeChannelMessage(mockMessage);
            expect(subscriptionManager.getChannelSubscribers).toHaveBeenCalledWith('channel-123');
        });
        it('should broadcast message to channel', async () => {
            await messageRouter.routeChannelMessage(mockMessage);
            expect(messageBroadcaster.broadcastMessage).toHaveBeenCalledWith(mockMessage);
        });
        it('should still broadcast if author not subscribed', async () => {
            vi.mocked(subscriptionManager.isSubscribed).mockResolvedValue(false);
            await messageRouter.routeChannelMessage(mockMessage);
            expect(messageBroadcaster.broadcastMessage).toHaveBeenCalledWith(mockMessage);
        });
        it('should throw error if channelId is missing', async () => {
            const invalidMessage = { ...mockMessage, channelId: null };
            await expect(messageRouter.routeChannelMessage(invalidMessage)).rejects.toThrow('Channel ID is required for channel messages');
        });
        it('should throw error on broadcast failure', async () => {
            vi.mocked(messageBroadcaster.broadcastMessage).mockRejectedValue(new Error('Broadcast error'));
            await expect(messageRouter.routeChannelMessage(mockMessage)).rejects.toThrow('Broadcast error');
        });
    });
    describe('routeDM', () => {
        it('should broadcast to author only (placeholder)', async () => {
            const dmMessage = { ...mockMessage, channelId: null };
            await messageRouter.routeDM(dmMessage);
            expect(messageBroadcaster.broadcastToUser).toHaveBeenCalledWith('user-1', 'message:created', dmMessage);
        });
        it('should handle broadcast error', async () => {
            vi.mocked(messageBroadcaster.broadcastToUser).mockRejectedValue(new Error('Broadcast error'));
            await expect(messageRouter.routeDM(mockMessage)).rejects.toThrow('Broadcast error');
        });
    });
    describe('Edge Cases', () => {
        it('should handle empty message content', async () => {
            const emptyMessage = { ...mockMessage, content: '' };
            await messageRouter.routeMessage(emptyMessage);
            expect(messageBroadcaster.broadcastMessage).toHaveBeenCalledWith(emptyMessage);
        });
        it('should handle special characters in channel ID', async () => {
            const specialMessage = { ...mockMessage, channelId: 'channel-!@#$%' };
            await messageRouter.routeChannelMessage(specialMessage);
            expect(subscriptionManager.isSubscribed).toHaveBeenCalledWith('user-1', 'channel-!@#$%');
        });
        it('should handle very long message content', async () => {
            const longMessage = { ...mockMessage, content: 'a'.repeat(10000) };
            await messageRouter.routeMessage(longMessage);
            expect(messageBroadcaster.broadcastMessage).toHaveBeenCalledWith(longMessage);
        });
        it('should handle channel with no subscribers', async () => {
            vi.mocked(subscriptionManager.getChannelSubscribers).mockResolvedValue(new Set());
            await messageRouter.routeChannelMessage(mockMessage);
            expect(messageBroadcaster.broadcastMessage).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=message.router.test.js.map