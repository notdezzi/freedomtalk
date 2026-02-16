import { wsConfig } from '../../config/websocket';
import { logger } from '../../config/logger';
class ConnectionManager {
    connections = new Map();
    userConnections = new Map();
    addConnection(socketId, userId) {
        if (this.connections.size >= wsConfig.maxConnections) {
            throw new Error(`Global connection limit exceeded (${wsConfig.maxConnections})`);
        }
        const userSockets = this.userConnections.get(userId);
        if (userSockets && userSockets.size >= wsConfig.maxConnectionsPerUser) {
            throw new Error(`Per-user connection limit exceeded (${wsConfig.maxConnectionsPerUser})`);
        }
        const now = new Date();
        this.connections.set(socketId, {
            userId,
            socketId,
            connectedAt: now,
            lastActivity: now,
        });
        if (!userSockets) {
            this.userConnections.set(userId, new Set([socketId]));
        }
        else {
            userSockets.add(socketId);
        }
        logger.debug({ socketId, userId, totalConnections: this.connections.size }, 'Connection added');
    }
    removeConnection(socketId) {
        const connection = this.connections.get(socketId);
        if (!connection) {
            logger.warn({ socketId }, 'Attempted to remove non-existent connection');
            return;
        }
        const { userId } = connection;
        this.connections.delete(socketId);
        const userSockets = this.userConnections.get(userId);
        if (userSockets) {
            userSockets.delete(socketId);
            if (userSockets.size === 0) {
                this.userConnections.delete(userId);
            }
        }
        logger.debug({ socketId, userId, totalConnections: this.connections.size }, 'Connection removed');
    }
    getUserConnections(userId) {
        const userSockets = this.userConnections.get(userId);
        return userSockets ? Array.from(userSockets) : [];
    }
    getConnectionCount() {
        return this.connections.size;
    }
    getUserConnectionCount(userId) {
        const userSockets = this.userConnections.get(userId);
        return userSockets ? userSockets.size : 0;
    }
    updateActivity(socketId) {
        const connection = this.connections.get(socketId);
        if (connection) {
            connection.lastActivity = new Date();
        }
    }
    getConnection(socketId) {
        return this.connections.get(socketId);
    }
    getAllConnections() {
        return Array.from(this.connections.values());
    }
}
export const connectionManager = new ConnectionManager();
//# sourceMappingURL=connection.manager.js.map