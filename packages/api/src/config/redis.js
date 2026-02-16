import { createClient } from 'redis';
const redisConfig = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('Redis reconnection failed after 10 attempts');
                return new Error('Redis reconnection limit exceeded');
            }
            return Math.min(retries * 100, 3000);
        },
    },
};
console.log('[DEBUG] Creating new Redis client instance at module load time:', new Date().toISOString());
export let redisClient = createClient(redisConfig);
console.log('[DEBUG] Redis client created (NOT connected yet):', {
    isOpen: redisClient.isOpen,
    isReady: redisClient.isReady
});
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
export const connectRedis = async () => {
    console.log('[DEBUG] connectRedis() called:', {
        isOpen: redisClient.isOpen,
        isReady: redisClient.isReady,
        timestamp: new Date().toISOString()
    });
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('[DEBUG] Redis client connected successfully');
    }
    else {
        console.log('[DEBUG] Redis client already open, skipping connect');
    }
};
export const disconnectRedis = async () => {
    console.log('[DEBUG] disconnectRedis() called:', {
        isOpen: redisClient.isOpen,
        isReady: redisClient.isReady,
        timestamp: new Date().toISOString()
    });
    if (redisClient.isOpen) {
        await redisClient.quit();
        console.log('[DEBUG] Redis client disconnected successfully');
    }
    else {
        console.log('[DEBUG] Redis client already closed, skipping disconnect');
    }
};
export const getRedisClient = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('[DEBUG] Redis client connected successfully');
    }
    else {
        console.log('[DEBUG] Redis client already open, skipping connect');
    }
    console.log('[DEBUG] getRedisClient() called:', {
        isOpen: redisClient.isOpen,
        isReady: redisClient.isReady,
        clientId: redisClient._socket?.remoteAddress || 'no-socket',
        timestamp: new Date().toISOString()
    });
    if (!redisClient.isOpen) {
        console.error('[ERROR] Redis client is NOT open when getRedisClient() was called');
    }
    return redisClient;
};
//# sourceMappingURL=redis.js.map