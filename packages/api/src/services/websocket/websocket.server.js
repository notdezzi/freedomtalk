import { Server as SocketIOServer } from 'socket.io';
import { wsConfig, createRedisAdapter } from '../../config/websocket';
import { logger } from '../../config/logger';
class WebSocketServer {
    io = null;
    initialized = false;
    async initialize(httpServer) {
        if (this.initialized) {
            logger.warn('WebSocket server already initialized');
            return;
        }
        try {
            logger.info('Initializing WebSocket server...');
            this.io = new SocketIOServer(httpServer, {
                cors: wsConfig.cors,
                pingInterval: wsConfig.pingInterval,
                pingTimeout: wsConfig.pingTimeout,
                transports: ['websocket', 'polling'],
            });
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
        }
        catch (error) {
            logger.error({ error }, 'Failed to initialize WebSocket server');
            throw error;
        }
    }
    getIO() {
        if (!this.io || !this.initialized) {
            throw new Error('WebSocket server not initialized. Call initialize() first.');
        }
        return this.io;
    }
    isInitialized() {
        return this.initialized && this.io !== null;
    }
    async close() {
        if (!this.io) {
            logger.warn('WebSocket server not initialized, nothing to close');
            return;
        }
        try {
            logger.info('Closing WebSocket server...');
            this.io.disconnectSockets(true);
            await new Promise((resolve) => {
                this.io.close(() => {
                    logger.info('WebSocket server closed successfully');
                    resolve();
                });
            });
            this.io = null;
            this.initialized = false;
        }
        catch (error) {
            logger.error({ error }, 'Error closing WebSocket server');
            throw error;
        }
    }
}
export const wsServer = new WebSocketServer();
//# sourceMappingURL=websocket.server.js.map