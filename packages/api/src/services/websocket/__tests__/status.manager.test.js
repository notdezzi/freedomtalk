import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { statusManager, UserStatus } from '../status.manager';
import { getRedisClient } from '../../../config/redis';
import { wsServer } from '../websocket.server';
import { WS_EVENTS } from '@freedomtalk/shared';
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
describe('StatusManager', () => {
    let mockRedis;
    let mockIO;
    beforeEach(() => {
        vi.clearAllMocks();
        mockRedis = {
            set: vi.fn().mockResolvedValue('OK'),
            get: vi.fn().mockResolvedValue(null),
            mGet: vi.fn().mockResolvedValue([]),
        };
        vi.mocked(getRedisClient).mockResolvedValue(mockRedis);
        mockIO = {
            emit: vi.fn(),
        };
        vi.mocked(wsServer.getIO).mockReturnValue(mockIO);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('setStatus', () => {
        it('should set user status to ONLINE', async () => {
            await statusManager.setStatus('user-1', UserStatus.ONLINE);
            expect(mockRedis.set).toHaveBeenCalledWith('status:user-1', UserStatus.ONLINE, { EX: 3600 });
        });
        it('should set user status to AWAY', async () => {
            await statusManager.setStatus('user-1', UserStatus.AWAY);
            expect(mockRedis.set).toHaveBeenCalledWith('status:user-1', UserStatus.AWAY, { EX: 3600 });
        });
        it('should set user status to BUSY', async () => {
            await statusManager.setStatus('user-1', UserStatus.BUSY);
            expect(mockRedis.set).toHaveBeenCalledWith('status:user-1', UserStatus.BUSY, { EX: 3600 });
        });
        it('should set user status to OFFLINE', async () => {
            await statusManager.setStatus('user-1', UserStatus.OFFLINE);
            expect(mockRedis.set).toHaveBeenCalledWith('status:user-1', UserStatus.OFFLINE, {
                EX: 3600,
            });
        });
        it('should broadcast status change', async () => {
            await statusManager.setStatus('user-1', UserStatus.AWAY);
            expect(mockIO.emit).toHaveBeenCalledWith(WS_EVENTS.STATUS_CHANGE, expect.objectContaining({
                userId: 'user-1',
                status: UserStatus.AWAY,
                timestamp: expect.any(String),
            }));
        });
        it('should throw error on Redis failure', async () => {
            mockRedis.set.mockRejectedValue(new Error('Redis error'));
            await expect(statusManager.setStatus('user-1', UserStatus.ONLINE)).rejects.toThrow('Redis error');
        });
        it('should handle broadcast errors gracefully', async () => {
            mockIO.emit.mockImplementation(() => {
                throw new Error('Broadcast error');
            });
            await expect(statusManager.setStatus('user-1', UserStatus.ONLINE)).resolves.not.toThrow();
        });
    });
    describe('getStatus', () => {
        it('should return ONLINE status', async () => {
            mockRedis.get.mockResolvedValue(UserStatus.ONLINE);
            const status = await statusManager.getStatus('user-1');
            expect(mockRedis.get).toHaveBeenCalledWith('status:user-1');
            expect(status).toBe(UserStatus.ONLINE);
        });
        it('should return AWAY status', async () => {
            mockRedis.get.mockResolvedValue(UserStatus.AWAY);
            const status = await statusManager.getStatus('user-1');
            expect(status).toBe(UserStatus.AWAY);
        });
        it('should return BUSY status', async () => {
            mockRedis.get.mockResolvedValue(UserStatus.BUSY);
            const status = await statusManager.getStatus('user-1');
            expect(status).toBe(UserStatus.BUSY);
        });
        it('should return OFFLINE when status is not in Redis', async () => {
            mockRedis.get.mockResolvedValue(null);
            const status = await statusManager.getStatus('user-1');
            expect(status).toBe(UserStatus.OFFLINE);
        });
        it('should return OFFLINE for invalid status value', async () => {
            mockRedis.get.mockResolvedValue('invalid-status');
            const status = await statusManager.getStatus('user-1');
            expect(status).toBe(UserStatus.OFFLINE);
        });
        it('should return OFFLINE on Redis error', async () => {
            mockRedis.get.mockRejectedValue(new Error('Redis error'));
            const status = await statusManager.getStatus('user-1');
            expect(status).toBe(UserStatus.OFFLINE);
        });
    });
    describe('getBulkStatus', () => {
        it('should return status for multiple users', async () => {
            mockRedis.mGet.mockResolvedValue([UserStatus.ONLINE, null, UserStatus.AWAY, UserStatus.BUSY]);
            const statusMap = await statusManager.getBulkStatus([
                'user-1',
                'user-2',
                'user-3',
                'user-4',
            ]);
            expect(mockRedis.mGet).toHaveBeenCalledWith([
                'status:user-1',
                'status:user-2',
                'status:user-3',
                'status:user-4',
            ]);
            expect(statusMap.size).toBe(4);
            expect(statusMap.get('user-1')).toBe(UserStatus.ONLINE);
            expect(statusMap.get('user-2')).toBe(UserStatus.OFFLINE);
            expect(statusMap.get('user-3')).toBe(UserStatus.AWAY);
            expect(statusMap.get('user-4')).toBe(UserStatus.BUSY);
        });
        it('should return empty map for empty user list', async () => {
            const statusMap = await statusManager.getBulkStatus([]);
            expect(statusMap.size).toBe(0);
        });
        it('should return all OFFLINE on Redis error', async () => {
            mockRedis.mGet.mockRejectedValue(new Error('Redis error'));
            const statusMap = await statusManager.getBulkStatus(['user-1', 'user-2']);
            expect(statusMap.size).toBe(2);
            expect(statusMap.get('user-1')).toBe(UserStatus.OFFLINE);
            expect(statusMap.get('user-2')).toBe(UserStatus.OFFLINE);
        });
        it('should handle invalid status values in bulk', async () => {
            mockRedis.mGet.mockResolvedValue([UserStatus.ONLINE, 'invalid', null]);
            const statusMap = await statusManager.getBulkStatus(['user-1', 'user-2', 'user-3']);
            expect(statusMap.get('user-1')).toBe(UserStatus.ONLINE);
            expect(statusMap.get('user-2')).toBe(UserStatus.OFFLINE);
            expect(statusMap.get('user-3')).toBe(UserStatus.OFFLINE);
        });
        it('should handle large batch of users', async () => {
            const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);
            const values = Array.from({ length: 100 }, (_, i) => {
                const statuses = [UserStatus.ONLINE, UserStatus.AWAY, UserStatus.BUSY, null];
                return statuses[i % 4];
            });
            mockRedis.mGet.mockResolvedValue(values);
            const statusMap = await statusManager.getBulkStatus(userIds);
            expect(statusMap.size).toBe(100);
            expect(statusMap.get('user-0')).toBe(UserStatus.ONLINE);
            expect(statusMap.get('user-1')).toBe(UserStatus.AWAY);
            expect(statusMap.get('user-2')).toBe(UserStatus.BUSY);
            expect(statusMap.get('user-3')).toBe(UserStatus.OFFLINE);
        });
    });
    describe('setOffline', () => {
        it('should set user status to OFFLINE', async () => {
            await statusManager.setOffline('user-1');
            expect(mockRedis.set).toHaveBeenCalledWith('status:user-1', UserStatus.OFFLINE, {
                EX: 3600,
            });
        });
        it('should broadcast OFFLINE status change', async () => {
            await statusManager.setOffline('user-1');
            expect(mockIO.emit).toHaveBeenCalledWith(WS_EVENTS.STATUS_CHANGE, expect.objectContaining({
                userId: 'user-1',
                status: UserStatus.OFFLINE,
            }));
        });
    });
    describe('Edge Cases', () => {
        it('should handle rapid status changes', async () => {
            await statusManager.setStatus('user-1', UserStatus.ONLINE);
            await statusManager.setStatus('user-1', UserStatus.AWAY);
            await statusManager.setStatus('user-1', UserStatus.BUSY);
            await statusManager.setStatus('user-1', UserStatus.OFFLINE);
            expect(mockRedis.set).toHaveBeenCalledTimes(4);
            expect(mockIO.emit).toHaveBeenCalledTimes(4);
        });
        it('should handle concurrent status updates for different users', async () => {
            await Promise.all([
                statusManager.setStatus('user-1', UserStatus.ONLINE),
                statusManager.setStatus('user-2', UserStatus.AWAY),
                statusManager.setStatus('user-3', UserStatus.BUSY),
            ]);
            expect(mockRedis.set).toHaveBeenCalledTimes(3);
            expect(mockIO.emit).toHaveBeenCalledTimes(3);
        });
        it('should handle empty user ID', async () => {
            await statusManager.setStatus('', UserStatus.ONLINE);
            expect(mockRedis.set).toHaveBeenCalledWith('status:', UserStatus.ONLINE, { EX: 3600 });
        });
        it('should handle special characters in user ID', async () => {
            const specialUserId = 'user-!@#$%^&*()';
            await statusManager.setStatus(specialUserId, UserStatus.ONLINE);
            expect(mockRedis.set).toHaveBeenCalledWith(`status:${specialUserId}`, UserStatus.ONLINE, {
                EX: 3600,
            });
        });
        it('should handle same status being set multiple times', async () => {
            await statusManager.setStatus('user-1', UserStatus.ONLINE);
            await statusManager.setStatus('user-1', UserStatus.ONLINE);
            await statusManager.setStatus('user-1', UserStatus.ONLINE);
            expect(mockRedis.set).toHaveBeenCalledTimes(3);
            expect(mockIO.emit).toHaveBeenCalledTimes(3);
        });
    });
});
//# sourceMappingURL=status.manager.test.js.map