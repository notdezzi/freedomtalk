import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { wsConfig, createRedisAdapter } from '../../config/websocket';
import { logger } from '../../config/logger';

/**
 * WebSocket Server class
 * Manages Socket.io server lifecycle and configuration
 */
class WebSocketServer {
  private io: SocketIOServer | null = null;
  private initialized = false;

  /**
   * Initialize the WebSocket server
   * @param httpServer - HTTP server instance to attach Socket.io to
   */
  async initialize(httpServer: HTTPServer): Promise<void> {
    if (this.initialized) {
      logger.warn('WebSocket server already initialized');
      return;
    }

    try {
      logger.info('Initializing WebSocket server...');

      // Create Socket.io server
      this.io = new SocketIOServer(httpServer, {
        cors: wsConfig.cors,
        pingInterval: wsConfig.pingInterval,
        pingTimeout: wsConfig.pingTimeout,
        transports: ['websocket', 'polling'],
      });

      // Attach Redis adapter for horizontal scaling
      const adapter = createRedisAdapter();
      this.io.adapter(adapter);

      logger.info('Redis adapter attached to Socket.io server');

      this.initialized = true;
      logger.info({
        pingInterval: wsConfig.pingInterval,
        pingTimeout: wsConfig.pingTimeout,
        maxConnections: wsConfig.maxConnections,
        maxConnectionsPerUser: wsConfig.maxConnectionsPerUser,
      }, 'WebSocket server initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize WebSocket server');
      throw error;
    }
  }

  /**
   * Get the Socket.io server instance
   * @returns Socket.io server instance
   * @throws Error if server is not initialized
   */
  getIO(): SocketIOServer {
    if (!this.io || !this.initialized) {
      throw new Error('WebSocket server not initialized. Call initialize() first.');
    }
    return this.io;
  }

  /**
   * Check if server is initialized
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.io !== null;
  }

  /**
   * Close the WebSocket server and all connections
   */
  async close(): Promise<void> {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, nothing to close');
      return;
    }

    try {
      logger.info('Closing WebSocket server...');

      // Close all socket connections
      this.io.disconnectSockets(true);

      // Close the server
      await new Promise<void>((resolve) => {
        this.io!.close(() => {
          logger.info('WebSocket server closed successfully');
          resolve();
        });
      });

      this.io = null;
      this.initialized = false;
    } catch (error) {
      logger.error({ error }, 'Error closing WebSocket server');
      throw error;
    }
  }
}

// Export singleton instance
export const wsServer = new WebSocketServer();

