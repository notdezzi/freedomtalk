import { createAdapter } from '@socket.io/redis-adapter';
import { redisClient } from './redis';

/**
 * WebSocket server configuration interface
 */
export interface WebSocketConfig {
  /**
   * CORS configuration for WebSocket connections
   */
  cors: {
    origin: string | string[] | boolean;
    credentials: boolean;
  };
  
  /**
   * Heartbeat ping interval in milliseconds
   * @default 25000 (25 seconds)
   */
  pingInterval: number;
  
  /**
   * Heartbeat ping timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  pingTimeout: number;
  
  /**
   * Maximum number of concurrent WebSocket connections globally
   * @default 10000
   */
  maxConnections: number;
  
  /**
   * Maximum number of concurrent connections per user
   * @default 5
   */
  maxConnectionsPerUser: number;
}

/**
 * WebSocket server configuration
 * Supports environment variable customization
 */
export const wsConfig: WebSocketConfig = {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
  pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '30000', 10),
  maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '10000', 10),
  maxConnectionsPerUser: parseInt(process.env.WS_MAX_CONNECTIONS_PER_USER || '5', 10),
};

/**
 * Create Redis adapter for Socket.io horizontal scaling
 * 
 * This adapter enables Socket.io to work across multiple server instances
 * by using Redis pub/sub for message broadcasting.
 * 
 * @returns Redis adapter instance for Socket.io
 * 
 * @example
 * ```typescript
 * const io = new Server(httpServer);
 * io.adapter(createRedisAdapter());
 * ```
 */
export const createRedisAdapter = () => {
  // Create a duplicate Redis client for pub/sub
  // Socket.io Redis adapter requires two separate clients: one for pub, one for sub
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();
  
  // Connect both clients
  Promise.all([
    pubClient.connect(),
    subClient.connect(),
  ]).catch((err) => {
    console.error('Failed to connect Redis clients for Socket.io adapter:', err);
  });
  
  return createAdapter(pubClient, subClient);
};

