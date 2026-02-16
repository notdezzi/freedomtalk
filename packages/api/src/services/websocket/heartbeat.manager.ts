import { Socket } from 'socket.io';
import { wsConfig } from '../../config/websocket';
import { logger } from '../../config/logger';
import { connectionManager } from './connection.manager';

/**
 * Heartbeat Manager class
 * Implements ping/pong heartbeat mechanism to detect stale connections
 */
class HeartbeatManager {
  // Map of socketId -> timeout handle
  private heartbeats: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start heartbeat for a socket connection
   * @param socket - Socket instance
   */
  startHeartbeat(socket: Socket): void {
    const socketId = socket.id;

    // Set up ping interval
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
        connectionManager.updateActivity(socketId);
      } else {
        this.stopHeartbeat(socketId);
      }
    }, wsConfig.pingInterval);

    // Set up pong timeout
    const pongTimeout = setTimeout(() => {
      logger.warn({ socketId }, 'Heartbeat timeout - disconnecting socket');
      socket.disconnect(true);
      this.stopHeartbeat(socketId);
    }, wsConfig.pingTimeout);

    // Store both interval and timeout
    this.heartbeats.set(socketId, pongTimeout);

    // Listen for pong responses
    socket.on('pong', () => {
      this.handlePong(socketId);
    });

    // Clean up interval on disconnect
    socket.on('disconnect', () => {
      clearInterval(pingInterval);
      this.stopHeartbeat(socketId);
    });

    logger.debug({ socketId }, 'Heartbeat started');
  }

  /**
   * Stop heartbeat for a socket
   * @param socketId - Socket ID
   */
  stopHeartbeat(socketId: string): void {
    const timeout = this.heartbeats.get(socketId);
    if (timeout) {
      clearTimeout(timeout);
      this.heartbeats.delete(socketId);
      logger.debug({ socketId }, 'Heartbeat stopped');
    }
  }

  /**
   * Handle pong response from client
   * @param socketId - Socket ID
   */
  handlePong(socketId: string): void {
    // Update activity timestamp
    connectionManager.updateActivity(socketId);

    // Reset timeout
    const existingTimeout = this.heartbeats.get(socketId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const newTimeout = setTimeout(() => {
      logger.warn({ socketId }, 'Heartbeat timeout after pong - disconnecting socket');
      this.stopHeartbeat(socketId);
    }, wsConfig.pingTimeout);

    this.heartbeats.set(socketId, newTimeout);
  }

  /**
   * Get active heartbeat count
   * @returns Number of active heartbeats
   */
  getActiveHeartbeatCount(): number {
    return this.heartbeats.size;
  }
}

// Export singleton instance
export const heartbeatManager = new HeartbeatManager();

