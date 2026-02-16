import { wsConfig } from '../../config/websocket';
import { logger } from '../../config/logger';

/**
 * Connection metadata interface
 */
export interface ConnectionMetadata {
  userId: string;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
}

/**
 * Connection Manager class
 * Tracks active WebSocket connections and enforces connection limits
 */
class ConnectionManager {
  // Map of socketId -> ConnectionMetadata
  private connections: Map<string, ConnectionMetadata> = new Map();
  
  // Map of userId -> Set of socketIds
  private userConnections: Map<string, Set<string>> = new Map();

  /**
   * Add a new connection
   * @param socketId - Socket ID
   * @param userId - User ID
   * @throws Error if connection limits are exceeded
   */
  addConnection(socketId: string, userId: string): void {
    // Check global connection limit
    if (this.connections.size >= wsConfig.maxConnections) {
      throw new Error(`Global connection limit exceeded (${wsConfig.maxConnections})`);
    }

    // Check per-user connection limit
    const userSockets = this.userConnections.get(userId);
    if (userSockets && userSockets.size >= wsConfig.maxConnectionsPerUser) {
      throw new Error(`Per-user connection limit exceeded (${wsConfig.maxConnectionsPerUser})`);
    }

    // Add connection metadata
    const now = new Date();
    this.connections.set(socketId, {
      userId,
      socketId,
      connectedAt: now,
      lastActivity: now,
    });

    // Add to user connections
    if (!userSockets) {
      this.userConnections.set(userId, new Set([socketId]));
    } else {
      userSockets.add(socketId);
    }

    logger.debug({ socketId, userId, totalConnections: this.connections.size }, 'Connection added');
  }

  /**
   * Remove a connection
   * @param socketId - Socket ID
   */
  removeConnection(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (!connection) {
      logger.warn({ socketId }, 'Attempted to remove non-existent connection');
      return;
    }

    const { userId } = connection;

    // Remove from connections map
    this.connections.delete(socketId);

    // Remove from user connections
    const userSockets = this.userConnections.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      
      // Clean up empty sets
      if (userSockets.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    logger.debug({ socketId, userId, totalConnections: this.connections.size }, 'Connection removed');
  }

  /**
   * Get all socket IDs for a user
   * @param userId - User ID
   * @returns Array of socket IDs
   */
  getUserConnections(userId: string): string[] {
    const userSockets = this.userConnections.get(userId);
    return userSockets ? Array.from(userSockets) : [];
  }

  /**
   * Get total connection count
   * @returns Total number of connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connection count for a specific user
   * @param userId - User ID
   * @returns Number of connections for the user
   */
  getUserConnectionCount(userId: string): number {
    const userSockets = this.userConnections.get(userId);
    return userSockets ? userSockets.size : 0;
  }

  /**
   * Update last activity timestamp for a connection
   * @param socketId - Socket ID
   */
  updateActivity(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Get connection metadata
   * @param socketId - Socket ID
   * @returns Connection metadata or undefined
   */
  getConnection(socketId: string): ConnectionMetadata | undefined {
    return this.connections.get(socketId);
  }

  /**
   * Get all connections
   * @returns Array of all connection metadata
   */
  getAllConnections(): ConnectionMetadata[] {
    return Array.from(this.connections.values());
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();

