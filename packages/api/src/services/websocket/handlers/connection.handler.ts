import { Socket } from 'socket.io';
import { logger } from '../../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { connectionManager } from '../connection.manager';
import { connectionValidator } from '../connection.validator';
import { heartbeatManager } from '../heartbeat.manager';
import { presenceManager } from '../presence.manager';
import { statusManager, UserStatus } from '../status.manager';
import { subscriptionManager } from '../subscription.manager';
import { wsConfig } from '../../../config/websocket';

/**
 * Handle new WebSocket connection
 * @param socket - Socket instance
 */
export async function handleConnection(socket: Socket): Promise<void> {
  try {
    const user = socket.data.user;
    
    if (!user) {
      logger.error({ socketId: socket.id }, 'Connection handler called without authenticated user');
      socket.disconnect(true);
      return;
    }

    logger.info({ socketId: socket.id, userId: user.id }, 'New WebSocket connection');

    // Check global connection limit
    const globalConnectionCount = connectionManager.getConnectionCount();
    if (globalConnectionCount >= wsConfig.maxConnections) {
      logger.warn({ socketId: socket.id, userId: user.id, globalConnectionCount }, 'Global connection limit exceeded');
      socket.emit(WS_EVENTS.CONNECTION_LIMIT_EXCEEDED, {
        code: 'GLOBAL_LIMIT_EXCEEDED',
        message: `Maximum global connections (${wsConfig.maxConnections}) exceeded`,
        limit: wsConfig.maxConnections,
        current: globalConnectionCount,
      });
      socket.disconnect(true);
      return;
    }

    // Check per-user connection limit
    const userConnectionCount = connectionManager.getUserConnectionCount(user.id);
    if (userConnectionCount >= wsConfig.maxConnectionsPerUser) {
      logger.warn({ socketId: socket.id, userId: user.id, userConnectionCount }, 'Per-user connection limit exceeded');
      socket.emit(WS_EVENTS.CONNECTION_LIMIT_EXCEEDED, {
        code: 'USER_LIMIT_EXCEEDED',
        message: `Maximum connections per user (${wsConfig.maxConnectionsPerUser}) exceeded`,
        limit: wsConfig.maxConnectionsPerUser,
        current: userConnectionCount,
      });
      socket.disconnect(true);
      return;
    }

    // Validate connection
    const validation = await connectionValidator.validateConnection(socket, user);
    if (!validation.success) {
      logger.warn({ socketId: socket.id, userId: user.id, error: validation.error }, 'Connection validation failed');
      socket.emit(WS_EVENTS.ERROR, {
        code: 'VALIDATION_FAILED',
        message: validation.error || 'Connection validation failed',
      });
      socket.disconnect(true);
      return;
    }

    // Add to connection manager
    connectionManager.addConnection(socket.id, user.id);

    // Start heartbeat
    heartbeatManager.startHeartbeat(socket);

    // Set presence online
    await presenceManager.setOnline(user.id);

    // Set status to online
    await statusManager.setStatus(user.id, UserStatus.ONLINE);

    // Sync subscriptions
    await subscriptionManager.syncSubscriptions(user.id);

    // Emit authenticated event
    socket.emit(WS_EVENTS.AUTHENTICATED, {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    logger.info({ socketId: socket.id, userId: user.id }, 'WebSocket connection established');
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling connection');
    socket.emit(WS_EVENTS.ERROR, {
      code: 'CONNECTION_ERROR',
      message: 'Failed to establish connection',
    });
    socket.disconnect(true);
  }
}

/**
 * Handle WebSocket disconnection
 * @param socket - Socket instance
 */
export async function handleDisconnect(socket: Socket): Promise<void> {
  try {
    const user = socket.data.user;
    
    if (!user) {
      logger.warn({ socketId: socket.id }, 'Disconnect handler called without user data');
      return;
    }

    logger.info({ socketId: socket.id, userId: user.id }, 'WebSocket disconnection');

    // Remove from connection manager
    connectionManager.removeConnection(socket.id);

    // Stop heartbeat
    heartbeatManager.stopHeartbeat(socket.id);

    // Check if user has other connections
    const userConnections = connectionManager.getUserConnections(user.id);
    
    if (userConnections.length === 0) {
      // User has no more connections, set offline
      await presenceManager.setOffline(user.id);
      await statusManager.setOffline(user.id);
    }

    logger.info({ socketId: socket.id, userId: user.id }, 'WebSocket disconnection handled');
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling disconnection');
  }
}

/**
 * Handle ping event
 * @param socket - Socket instance
 */
export async function handlePing(socket: Socket): Promise<void> {
  try {
    const user = socket.data.user;
    
    if (!user) {
      return;
    }

    // Update activity
    connectionManager.updateActivity(socket.id);

    // Refresh presence
    await presenceManager.refreshPresence(user.id);

    // Send pong
    socket.emit(WS_EVENTS.PONG, {
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling ping');
  }
}

/**
 * Handle pong event
 * @param socket - Socket instance
 */
export function handlePong(socket: Socket): void {
  try {
    // Update heartbeat
    heartbeatManager.handlePong(socket.id);

    // Update activity
    connectionManager.updateActivity(socket.id);
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling pong');
  }
}

