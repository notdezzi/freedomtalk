import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

/**
 * Redis client configuration
 * Uses environment variables for connection settings
 */
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        logger.error('Redis reconnection failed after 10 attempts');
        return new Error('Redis reconnection limit exceeded');
      }
      return Math.min(retries * 100, 3000);
    },
  },
};

// Create Redis client
// Using 'let' instead of 'const' to allow reassignment during hot-reload scenarios
export let redisClient: RedisClientType = createClient(redisConfig);

// Handle Redis errors
redisClient.on('error', (err) => {
  logger.error({ error: err }, 'Redis client error');
});

redisClient.on('connect', () => {
  logger.debug('Redis client connected');
});

redisClient.on('ready', () => {
  logger.debug('Redis client ready');
});

redisClient.on('end', () => {
  logger.warn('Redis client connection closed');
});

redisClient.on('reconnecting', () => {
  logger.debug('Redis client reconnecting');
});

// Connect to Redis
export const connectRedis = async (): Promise<void> => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.debug('Redis client connected');
  }
};

// Disconnect from Redis
export const disconnectRedis = async (): Promise<void> => {
  if (redisClient.isOpen) {
    await redisClient.quit();
    logger.debug('Redis client disconnected');
  }
};

/**
 * Get the current active Redis client
 * Always use this getter instead of importing redisClient directly
 * to ensure you get the current active connection after server restarts
 * @returns The active Redis client instance
 */
export const getRedisClient = async (): Promise<RedisClientType> => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.debug('Redis client connected');
  }
  return redisClient;
};

