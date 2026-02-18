import { createClient, RedisClientType } from 'redis';

/**
 * Redis client configuration
 * Uses environment variables for connection settings
 */
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        console.error('Redis reconnection failed after 10 attempts');
        return new Error('Redis reconnection limit exceeded');
      }
      return Math.min(retries * 100, 3000);
    },
  },
};

// Create Redis client
// Using 'let' instead of 'const' to allow reassignment during hot-reload scenarios
console.log('[DEBUG] Creating new Redis client instance at module load time:', new Date().toISOString());
export let redisClient: RedisClientType = createClient(redisConfig);
console.log('[DEBUG] Redis client created (NOT connected yet):', {
  isOpen: redisClient.isOpen,
  isReady: redisClient.isReady
});

// Handle Redis errors
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

redisClient.on('end', () => {
  console.log('[DEBUG] Redis client END event fired - connection closed');
});

redisClient.on('reconnecting', () => {
  console.log('[DEBUG] Redis client RECONNECTING event fired');
});

// Connect to Redis
export const connectRedis = async (): Promise<void> => {
  //console.log('[DEBUG] connectRedis() called:', {
  //  isOpen: redisClient.isOpen,
  //  isReady: redisClient.isReady,
  //  timestamp: new Date().toISOString()
  //});

  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('[DEBUG] Redis client connected successfully');
  } else {
   // console.log('[DEBUG] Redis client already open, skipping connect');
  }
};

// Disconnect from Redis
export const disconnectRedis = async (): Promise<void> => {
  console.log('[DEBUG] disconnectRedis() called:', {
    isOpen: redisClient.isOpen,
    isReady: redisClient.isReady,
    timestamp: new Date().toISOString()
  });

  if (redisClient.isOpen) {
    await redisClient.quit();
    console.log('[DEBUG] Redis client disconnected successfully');
  } else {
    console.log('[DEBUG] Redis client already closed, skipping disconnect');
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
    console.log('[DEBUG] Redis client connected successfully');
  } else {
    //console.log('[DEBUG] Redis client already open, skipping connect');
  }
  // Debug logging to track Redis client state
  //console.log('[DEBUG] getRedisClient() called:', {
  //  isOpen: redisClient.isOpen,
  //  isReady: redisClient.isReady,
  //  clientId: (redisClient as any)._socket?.remoteAddress || 'no-socket',
  //  timestamp: new Date().toISOString()
  //});

  if (!redisClient.isOpen) {
    console.error('[ERROR] Redis client is NOT open when getRedisClient() was called');
  }

  return redisClient;
};

