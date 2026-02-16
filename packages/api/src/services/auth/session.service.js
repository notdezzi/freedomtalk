import crypto from 'crypto';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { snowflake } from '../../utils/snowflake';
class SessionService {
    encryptionKey;
    IDLE_TIMEOUT = 30 * 60;
    ABSOLUTE_TIMEOUT = 7 * 24 * 60 * 60;
    constructor() {
        const keyHex = process.env.SESSION_ENCRYPTION_KEY;
        if (!keyHex || keyHex.length !== 64) {
            const error = 'SESSION_ENCRYPTION_KEY must be a 32-byte hex string (64 characters). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';
            logger.error(error);
            throw new Error(error);
        }
        this.encryptionKey = Buffer.from(keyHex, 'hex');
        logger.info('Session service initialized with AES-256-GCM encryption');
    }
    encryptData(data) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    }
    decryptData(encrypted) {
        const parts = encrypted.split(':');
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
            throw new Error('Invalid encrypted data format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedData = parts[1];
        const authTag = Buffer.from(parts[2], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async createSession(userId, data = {}) {
        console.log('[DEBUG] SessionService.createSession() called for userId:', userId);
        const sessionId = snowflake.generate();
        const now = Date.now();
        const sessionData = {
            userId,
            createdAt: now,
            lastActivity: now,
            ...data,
        };
        const encrypted = this.encryptData(JSON.stringify(sessionData));
        console.log('[DEBUG] About to call getRedisClient().setEx()');
        await (await getRedisClient()).setEx(`session:${sessionId}`, this.IDLE_TIMEOUT, encrypted);
        console.log('[DEBUG] Successfully called setEx(), now calling sAdd()');
        await (await getRedisClient()).sAdd(`user_sessions:${userId}`, sessionId);
        console.log('[DEBUG] Session created successfully');
        logger.info({ userId, sessionId }, 'Session created');
        return sessionId;
    }
    async getSession(sessionId) {
        const encrypted = await (await getRedisClient()).get(`session:${sessionId}`);
        if (!encrypted) {
            return null;
        }
        try {
            const decrypted = this.decryptData(encrypted);
            const sessionData = JSON.parse(decrypted);
            const now = Date.now();
            if (now - sessionData.createdAt > this.ABSOLUTE_TIMEOUT * 1000) {
                await this.deleteSession(sessionId);
                return null;
            }
            return sessionData;
        }
        catch (error) {
            logger.error({ error, sessionId }, 'Failed to decrypt session');
            return null;
        }
    }
    async updateSession(sessionId, data) {
        const existing = await this.getSession(sessionId);
        if (!existing) {
            throw new Error('Session not found');
        }
        const updated = {
            ...existing,
            ...data,
            lastActivity: Date.now(),
        };
        const encrypted = this.encryptData(JSON.stringify(updated));
        await (await getRedisClient()).setEx(`session:${sessionId}`, this.IDLE_TIMEOUT, encrypted);
    }
    async deleteSession(sessionId) {
        const session = await this.getSession(sessionId);
        if (session) {
            await (await getRedisClient()).sRem(`user_sessions:${session.userId}`, sessionId);
        }
        await (await getRedisClient()).del(`session:${sessionId}`);
        logger.info({ sessionId }, 'Session deleted');
    }
    async deleteUserSessions(userId) {
        const sessionIds = await (await getRedisClient()).sMembers(`user_sessions:${userId}`);
        if (sessionIds.length > 0) {
            const pipeline = (await getRedisClient()).multi();
            for (const sessionId of sessionIds) {
                pipeline.del(`session:${sessionId}`);
            }
            pipeline.del(`user_sessions:${userId}`);
            await pipeline.exec();
            logger.info({ userId, count: sessionIds.length }, 'All user sessions deleted');
        }
    }
    async regenerateSessionId(oldSessionId) {
        const sessionData = await this.getSession(oldSessionId);
        if (!sessionData) {
            throw new Error('Session not found');
        }
        await this.deleteSession(oldSessionId);
        const newSessionId = await this.createSession(sessionData.userId, sessionData);
        logger.info({ oldSessionId, newSessionId }, 'Session ID regenerated');
        return newSessionId;
    }
    async cleanupExpiredSessions() {
        logger.info('Session cleanup completed (Redis TTL handles expiration)');
        return 0;
    }
}
export const sessionService = new SessionService();
//# sourceMappingURL=session.service.js.map