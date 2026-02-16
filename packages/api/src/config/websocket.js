import { createAdapter } from '@socket.io/redis-adapter';
import { redisClient } from './redis';
export const wsConfig = {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    },
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '30000', 10),
    maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '10000', 10),
    maxConnectionsPerUser: parseInt(process.env.WS_MAX_CONNECTIONS_PER_USER || '5', 10),
};
export const createRedisAdapter = () => {
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();
    Promise.all([
        pubClient.connect(),
        subClient.connect(),
    ]).catch((err) => {
        console.error('Failed to connect Redis clients for Socket.io adapter:', err);
    });
    return createAdapter(pubClient, subClient);
};
//# sourceMappingURL=websocket.js.map