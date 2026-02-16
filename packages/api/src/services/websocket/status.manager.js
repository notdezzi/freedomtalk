import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { wsServer } from './websocket.server';
export var UserStatus;
(function (UserStatus) {
    UserStatus["ONLINE"] = "online";
    UserStatus["AWAY"] = "away";
    UserStatus["BUSY"] = "busy";
    UserStatus["OFFLINE"] = "offline";
})(UserStatus || (UserStatus = {}));
class StatusManager {
    STATUS_TTL = 3600;
    async setStatus(userId, status) {
        try {
            const redis = await getRedisClient();
            const key = `status:${userId}`;
            await redis.set(key, status, { EX: this.STATUS_TTL });
            this.broadcastStatusChange(userId, status);
            logger.debug({ userId, status }, 'User status updated');
        }
        catch (error) {
            logger.error({ error, userId, status }, 'Error setting user status');
            throw error;
        }
    }
    async getStatus(userId) {
        try {
            const redis = await getRedisClient();
            const key = `status:${userId}`;
            const status = await redis.get(key);
            if (status && Object.values(UserStatus).includes(status)) {
                return status;
            }
            return UserStatus.OFFLINE;
        }
        catch (error) {
            logger.error({ error, userId }, 'Error getting user status');
            return UserStatus.OFFLINE;
        }
    }
    async getBulkStatus(userIds) {
        const statusMap = new Map();
        try {
            const redis = await getRedisClient();
            const keys = userIds.map(id => `status:${id}`);
            const values = await redis.mGet(keys);
            userIds.forEach((userId, index) => {
                const status = values[index];
                if (status && Object.values(UserStatus).includes(status)) {
                    statusMap.set(userId, status);
                }
                else {
                    statusMap.set(userId, UserStatus.OFFLINE);
                }
            });
        }
        catch (error) {
            logger.error({ error, userCount: userIds.length }, 'Error getting bulk status');
            userIds.forEach(userId => statusMap.set(userId, UserStatus.OFFLINE));
        }
        return statusMap;
    }
    async setOffline(userId) {
        await this.setStatus(userId, UserStatus.OFFLINE);
    }
    broadcastStatusChange(userId, status) {
        try {
            const io = wsServer.getIO();
            io.emit(WS_EVENTS.STATUS_CHANGE, {
                userId,
                status,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger.error({ error, userId, status }, 'Error broadcasting status change');
        }
    }
}
export const statusManager = new StatusManager();
//# sourceMappingURL=status.manager.js.map