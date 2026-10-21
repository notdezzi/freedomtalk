import { Socket } from 'socket.io';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { connectionManager } from './connection.manager';
import { AuthUser } from './auth.middleware';

/**
 * Connection validation result interface
 */
export interface ValidationResult {
  success: boolean;
  error?: string;
  code?: string;
}

/**
 * Connection Validator class
 * Validates connection requests before acceptance
 */
class ConnectionValidator {
  // Tunable for load tests / NAT'd offices where many users share one IP
  private readonly MAX_CONNECTIONS_PER_IP = parseInt(process.env.WS_MAX_CONNECTIONS_PER_IP || '10', 10);
  private readonly RATE_LIMIT_WINDOW = parseInt(process.env.WS_IP_RATE_WINDOW_SEC || '60', 10); // seconds

  /**
   * Validate a connection request
   * @param socket - Socket instance
   * @param user - Authenticated user
   * @returns Validation result
   */
  async validateConnection(socket: Socket, user: AuthUser): Promise<ValidationResult> {
    try {
      // Validate account status
      const accountValidation = this.validateAccountStatus(user);
      if (!accountValidation.success) {
        return accountValidation;
      }

      // Check connection limits
      const limitValidation = this.validateConnectionLimits(user.id);
      if (!limitValidation.success) {
        return limitValidation;
      }

      // Check IP-based rate limiting
      const ipValidation = await this.validateIPRateLimit(socket);
      if (!ipValidation.success) {
        return ipValidation;
      }

      // Validate connection metadata
      const metadataValidation = this.validateMetadata(socket);
      if (!metadataValidation.success) {
        return metadataValidation;
      }

      logger.debug({ socketId: socket.id, userId: user.id }, 'Connection validation passed');
      return { success: true };
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Error during connection validation');
      return {
        success: false,
        error: 'Connection validation failed',
        code: 'VALIDATION_ERROR',
      };
    }
  }

  /**
   * Validate account status
   * @param user - User object
   * @returns Validation result
   */
  private validateAccountStatus(user: AuthUser): ValidationResult {
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

  /**
   * Validate connection limits
   * @param userId - User ID
   * @returns Validation result
   */
  private validateConnectionLimits(userId: string): ValidationResult {
    const userConnectionCount = connectionManager.getUserConnectionCount(userId);
    const globalConnectionCount = connectionManager.getConnectionCount();

    // Check per-user limit (will be enforced by connectionManager.addConnection)
    // This is a pre-check for better error messaging
    if (userConnectionCount >= 5) {
      logger.warn({ userId, userConnectionCount }, 'Connection rejected: per-user limit exceeded');
      return {
        success: false,
        error: 'Maximum connections per user exceeded (5)',
        code: 'USER_CONNECTION_LIMIT',
      };
    }

    // Check global limit
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

  /**
   * Validate IP-based rate limiting
   * @param socket - Socket instance
   * @returns Validation result
   */
  private async validateIPRateLimit(socket: Socket): Promise<ValidationResult> {
    try {
      const ip = this.extractIP(socket);
      if (!ip) {
        // If we can't extract IP, allow connection (fail open)
        return { success: true };
      }

      const redis = await getRedisClient();
      const key = `ratelimit:ip:${ip}`;

      // Get current connection count for this IP
      const count = await redis.incr(key);

      // Set expiry on first increment
      if (count === 1) {
        await redis.expire(key, this.RATE_LIMIT_WINDOW);
      }

      // Check if limit exceeded
      if (count > this.MAX_CONNECTIONS_PER_IP) {
        // Rejected attempts must not consume a slot, otherwise a client in a
        // reconnect loop keeps its own counter pinned above the limit and can
        // never get back in (self-DoS)
        await redis.decr(key).catch(() => undefined);
        logger.warn({ ip, count }, 'Connection rejected: IP rate limit exceeded');
        return {
          success: false,
          error: 'Too many connections from this IP address',
          code: 'IP_RATE_LIMIT',
        };
      }

      // Accepted: this socket holds a slot until it disconnects
      socket.data.ipRateLimitSlot = ip;

      return { success: true };
    } catch (error) {
      logger.error({ error }, 'Error checking IP rate limit');
      // Fail open - allow connection if Redis is unavailable
      return { success: true };
    }
  }

  /**
   * Validate connection metadata
   * @param socket - Socket instance
   * @returns Validation result
   */
  private validateMetadata(socket: Socket): ValidationResult {
    const userAgent = socket.handshake.headers['user-agent'];
    const origin = socket.handshake.headers.origin;

    // Validate user agent exists
    if (!userAgent) {
      logger.warn({ socketId: socket.id }, 'Connection rejected: missing user agent');
      return {
        success: false,
        error: 'Invalid connection metadata',
        code: 'INVALID_METADATA',
      };
    }

    // Log origin for monitoring (but don't reject based on it)
    logger.debug({ socketId: socket.id, origin, userAgent }, 'Connection metadata validated');

    return { success: true };
  }

  /**
   * Release the per-IP slot a connection consumed when it was accepted.
   * Called from the disconnect handler; without this, page reloads and
   * reconnects drain the window for up to RATE_LIMIT_WINDOW seconds.
   * @param socket - Disconnecting socket
   */
  async releaseIPSlot(socket: Socket): Promise<void> {
    const ip = socket.data.ipRateLimitSlot as string | undefined;
    if (!ip) return;
    socket.data.ipRateLimitSlot = undefined;
    try {
      const redis = await getRedisClient();
      const key = `ratelimit:ip:${ip}`;
      const count = await redis.decr(key);
      // Never let accounting glitches clamp the counter below zero (a
      // negative count would grant extra slots after the next reset)
      if (count < 0) {
        await redis.set(key, 0);
      }
    } catch (error) {
      logger.error({ error }, 'Error releasing IP rate limit slot');
    }
  }

  /**
   * Extract IP address from socket
   * @param socket - Socket instance
   * @returns IP address or null
   */
  private extractIP(socket: Socket): string | null {
    // Try X-Forwarded-For header first (for proxied connections)
    const forwardedFor = socket.handshake.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      if (ips && typeof ips === 'string') {
        const firstIp = ips.split(',')[0];
        return firstIp ? firstIp.trim() : null;
      }
    }

    // Fall back to socket address
    return socket.handshake.address || null;
  }
}

// Export singleton instance
export const connectionValidator = new ConnectionValidator();

