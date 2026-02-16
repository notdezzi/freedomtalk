import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { wsServer } from './websocket.server';

/**
 * User status enum
 */
export enum UserStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

/**
 * Status Manager class
 * Manages user status (online, away, busy, offline)
 */
class StatusManager {
  private readonly STATUS_TTL = 3600; // 1 hour

  /**
   * Set user status
   * @param userId - User ID
   * @param status - User status
   */
  async setStatus(userId: string, status: UserStatus): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `status:${userId}`;
      
      // Store status with TTL
      await redis.set(key, status, { EX: this.STATUS_TTL });

      // Broadcast status change
      this.broadcastStatusChange(userId, status);

      logger.debug({ userId, status }, 'User status updated');
    } catch (error) {
      logger.error({ error, userId, status }, 'Error setting user status');
      throw error;
    }
  }

  /**
   * Get user status
   * @param userId - User ID
   * @returns User status (defaults to OFFLINE)
   */
  async getStatus(userId: string): Promise<UserStatus> {
    try {
      const redis = await getRedisClient();
      const key = `status:${userId}`;
      const status = await redis.get(key);
      
      // Validate and return status
      if (status && Object.values(UserStatus).includes(status as UserStatus)) {
        return status as UserStatus;
      }
      
      return UserStatus.OFFLINE;
    } catch (error) {
      logger.error({ error, userId }, 'Error getting user status');
      return UserStatus.OFFLINE;
    }
  }

  /**
   * Get status for multiple users
   * @param userIds - Array of user IDs
   * @returns Map of userId -> status
   */
  async getBulkStatus(userIds: string[]): Promise<Map<string, UserStatus>> {
    const statusMap = new Map<string, UserStatus>();

    try {
      const redis = await getRedisClient();
      
      // Get all status keys
      const keys = userIds.map(id => `status:${id}`);
      const values = await redis.mGet(keys);

      // Map results
      userIds.forEach((userId, index) => {
        const status = values[index];
        if (status && Object.values(UserStatus).includes(status as UserStatus)) {
          statusMap.set(userId, status as UserStatus);
        } else {
          statusMap.set(userId, UserStatus.OFFLINE);
        }
      });
    } catch (error) {
      logger.error({ error, userCount: userIds.length }, 'Error getting bulk status');
      // Return all offline on error
      userIds.forEach(userId => statusMap.set(userId, UserStatus.OFFLINE));
    }

    return statusMap;
  }

  /**
   * Set user offline (called when presence expires)
   * @param userId - User ID
   */
  async setOffline(userId: string): Promise<void> {
    await this.setStatus(userId, UserStatus.OFFLINE);
  }

  /**
   * Broadcast status change to all connected clients
   * @param userId - User ID
   * @param status - User status
   */
  private broadcastStatusChange(userId: string, status: UserStatus): void {
    try {
      const io = wsServer.getIO();
      io.emit(WS_EVENTS.STATUS_CHANGE, {
        userId,
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error, userId, status }, 'Error broadcasting status change');
    }
  }
}

// Export singleton instance
export const statusManager = new StatusManager();

