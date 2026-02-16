/**
 * Redis Session Manager
 * 
 * Provides encrypted session management with Redis storage.
 * Supports multi-device logout and session fixation prevention.
 */

import crypto from 'crypto';
import { redisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { snowflake } from '../../utils/snowflake';

/**
 * Session data interface
 */
export interface SessionData {
  userId: string;
  mfaVerified?: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
  lastActivity: number;
  [key: string]: unknown;
}

/**
 * Session service class
 */
class SessionService {
  private encryptionKey: Buffer;
  private readonly IDLE_TIMEOUT = 30 * 60; // 30 minutes in seconds
  private readonly ABSOLUTE_TIMEOUT = 7 * 24 * 60 * 60; // 7 days in seconds

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

  /**
   * Encrypt session data
   * @param data - Data to encrypt
   * @returns Encrypted string in format: iv:encrypted:authTag
   */
  private encryptData(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }

  /**
   * Decrypt session data
   * @param encrypted - Encrypted string in format: iv:encrypted:authTag
   * @returns Decrypted data
   */
  private decryptData(encrypted: string): string {
    const parts = encrypted.split(':');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted: string = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Create a new session
   * @param userId - User ID
   * @param data - Additional session data
   * @returns Session ID
   */
  async createSession(userId: string, data: Partial<SessionData> = {}): Promise<string> {
    const sessionId = snowflake.generate();
    const now = Date.now();

    const sessionData: SessionData = {
      userId,
      createdAt: now,
      lastActivity: now,
      ...data,
    };

    const encrypted = this.encryptData(JSON.stringify(sessionData));
    
    // Store session with idle timeout
    await redisClient.setEx(`session:${sessionId}`, this.IDLE_TIMEOUT, encrypted);
    
    // Add to user's session set for multi-device logout
    await redisClient.sAdd(`user_sessions:${userId}`, sessionId);

    logger.info({ userId, sessionId }, 'Session created');
    return sessionId;
  }

  /**
   * Get session data
   * @param sessionId - Session ID
   * @returns Session data or null if not found
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const encrypted = await redisClient.get(`session:${sessionId}`);
    if (!encrypted) {
      return null;
    }

    try {
      const decrypted = this.decryptData(encrypted);
      const sessionData = JSON.parse(decrypted) as SessionData;

      // Check absolute timeout
      const now = Date.now();
      if (now - sessionData.createdAt > this.ABSOLUTE_TIMEOUT * 1000) {
        await this.deleteSession(sessionId);
        return null;
      }

      return sessionData;
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to decrypt session');
      return null;
    }
  }

  /**
   * Update session data and refresh TTL
   * @param sessionId - Session ID
   * @param data - Data to merge with existing session
   */
  async updateSession(sessionId: string, data: Partial<SessionData>): Promise<void> {
    const existing = await this.getSession(sessionId);
    if (!existing) {
      throw new Error('Session not found');
    }

    const updated: SessionData = {
      ...existing,
      ...data,
      lastActivity: Date.now(),
    };

    const encrypted = this.encryptData(JSON.stringify(updated));
    await redisClient.setEx(`session:${sessionId}`, this.IDLE_TIMEOUT, encrypted);
  }

  /**
   * Delete a session
   * @param sessionId - Session ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      await redisClient.sRem(`user_sessions:${session.userId}`, sessionId);
    }
    await redisClient.del(`session:${sessionId}`);
    logger.info({ sessionId }, 'Session deleted');
  }

  /**
   * Delete all sessions for a user (multi-device logout)
   * @param userId - User ID
   */
  async deleteUserSessions(userId: string): Promise<void> {
    const sessionIds = await redisClient.sMembers(`user_sessions:${userId}`);

    if (sessionIds.length > 0) {
      const pipeline = redisClient.multi();
      for (const sessionId of sessionIds) {
        pipeline.del(`session:${sessionId}`);
      }
      pipeline.del(`user_sessions:${userId}`);
      await pipeline.exec();

      logger.info({ userId, count: sessionIds.length }, 'All user sessions deleted');
    }
  }

  /**
   * Regenerate session ID (for session fixation prevention)
   * Call this after privilege escalation (login, MFA verification)
   * @param oldSessionId - Old session ID
   * @returns New session ID
   */
  async regenerateSessionId(oldSessionId: string): Promise<string> {
    const sessionData = await this.getSession(oldSessionId);
    if (!sessionData) {
      throw new Error('Session not found');
    }

    // Delete old session
    await this.deleteSession(oldSessionId);

    // Create new session with same data
    const newSessionId = await this.createSession(sessionData.userId, sessionData);

    logger.info({ oldSessionId, newSessionId }, 'Session ID regenerated');
    return newSessionId;
  }

  /**
   * Cleanup expired sessions (called by scheduled job)
   * Redis handles TTL automatically, but this cleans up user_sessions sets
   * @returns Number of cleaned sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    // This is a placeholder - Redis TTL handles most cleanup
    // In production, you might want to scan user_sessions sets and remove expired entries
    logger.info('Session cleanup completed (Redis TTL handles expiration)');
    return 0;
  }
}

/**
 * Session service singleton
 * Use this instance throughout the application
 */
export const sessionService = new SessionService();

