import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { connectionManager } from './connection.manager';
class ConnectionValidator {
    MAX_CONNECTIONS_PER_IP = 10;
    RATE_LIMIT_WINDOW = 60;
    async validateConnection(socket, user) {
        try {
            const accountValidation = this.validateAccountStatus(user);
            if (!accountValidation.success) {
                return accountValidation;
            }
            const limitValidation = this.validateConnectionLimits(user.id);
            if (!limitValidation.success) {
                return limitValidation;
            }
            const ipValidation = await this.validateIPRateLimit(socket);
            if (!ipValidation.success) {
                return ipValidation;
            }
            const metadataValidation = this.validateMetadata(socket);
            if (!metadataValidation.success) {
                return metadataValidation;
            }
            logger.debug({ socketId: socket.id, userId: user.id }, 'Connection validation passed');
            return { success: true };
        }
        catch (error) {
            logger.error({ error, socketId: socket.id }, 'Error during connection validation');
            return {
                success: false,
                error: 'Connection validation failed',
                code: 'VALIDATION_ERROR',
            };
        }
    }
    validateAccountStatus(user) {
        if (user.accountStatus !== 'active') {
            logger.warn({ userId: user.id, accountStatus: user.accountStatus }, 'Connection rejected: inactive account');
            return {
                success: false,
                error: `Account is ${user.accountStatus}`,
                code: 'ACCOUNT_INACTIVE',
            };
        }
        return { success: true };
    }
    validateConnectionLimits(userId) {
        const userConnectionCount = connectionManager.getUserConnectionCount(userId);
        const globalConnectionCount = connectionManager.getConnectionCount();
        if (userConnectionCount >= 5) {
            logger.warn({ userId, userConnectionCount }, 'Connection rejected: per-user limit exceeded');
            return {
                success: false,
                error: 'Maximum connections per user exceeded (5)',
                code: 'USER_CONNECTION_LIMIT',
            };
        }
        if (globalConnectionCount >= 10000) {
            logger.warn({ globalConnectionCount }, 'Connection rejected: global limit exceeded');
            return {
                success: false,
                error: 'Server at maximum capacity',
                code: 'GLOBAL_CONNECTION_LIMIT',
            };
        }
        return { success: true };
    }
    async validateIPRateLimit(socket) {
        try {
            const ip = this.extractIP(socket);
            if (!ip) {
                return { success: true };
            }
            const redis = await getRedisClient();
            const key = `ratelimit:ip:${ip}`;
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, this.RATE_LIMIT_WINDOW);
            }
            if (count > this.MAX_CONNECTIONS_PER_IP) {
                logger.warn({ ip, count }, 'Connection rejected: IP rate limit exceeded');
                return {
                    success: false,
                    error: 'Too many connections from this IP address',
                    code: 'IP_RATE_LIMIT',
                };
            }
            return { success: true };
        }
        catch (error) {
            logger.error({ error }, 'Error checking IP rate limit');
            return { success: true };
        }
    }
    validateMetadata(socket) {
        const userAgent = socket.handshake.headers['user-agent'];
        const origin = socket.handshake.headers.origin;
        if (!userAgent) {
            logger.warn({ socketId: socket.id }, 'Connection rejected: missing user agent');
            return {
                success: false,
                error: 'Invalid connection metadata',
                code: 'INVALID_METADATA',
            };
        }
        logger.debug({ socketId: socket.id, origin, userAgent }, 'Connection metadata validated');
        return { success: true };
    }
    extractIP(socket) {
        const forwardedFor = socket.handshake.headers['x-forwarded-for'];
        if (forwardedFor) {
            const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
            if (ips && typeof ips === 'string') {
                const firstIp = ips.split(',')[0];
                return firstIp ? firstIp.trim() : null;
            }
        }
        return socket.handshake.address || null;
    }
}
export const connectionValidator = new ConnectionValidator();
//# sourceMappingURL=connection.validator.js.map