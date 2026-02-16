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
export const redisClient = createClient(redisConfig);
redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});
redisClient.on('connect', () => {
    console.log('Redis client connected');
});
redisClient.on('ready', () => {
    console.log('Redis client ready');
});
export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};
export const disconnectRedis = async () => {
    if (redisClient.isOpen) {
        await redisClient.quit();
    }
};
//# sourceMappingURL=redis.js.map