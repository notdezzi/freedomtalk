import { wsConfig } from '../../config/websocket';
import { logger } from '../../config/logger';
import { connectionManager } from './connection.manager';
class HeartbeatManager {
    heartbeats = new Map();
    startHeartbeat(socket) {
        const socketId = socket.id;
        const pingInterval = setInterval(() => {
            if (socket.connected) {
                socket.emit('ping');
                connectionManager.updateActivity(socketId);
            }
            else {
                this.stopHeartbeat(socketId);
            }
        }, wsConfig.pingInterval);
        const pongTimeout = setTimeout(() => {
            logger.warn({ socketId }, 'Heartbeat timeout - disconnecting socket');
            socket.disconnect(true);
            this.stopHeartbeat(socketId);
        }, wsConfig.pingTimeout);
        this.heartbeats.set(socketId, pongTimeout);
        socket.on('pong', () => {
            this.handlePong(socketId);
        });
        socket.on('disconnect', () => {
            clearInterval(pingInterval);
            this.stopHeartbeat(socketId);
        });
        logger.debug({ socketId }, 'Heartbeat started');
    }
    stopHeartbeat(socketId) {
        const timeout = this.heartbeats.get(socketId);
        if (timeout) {
            clearTimeout(timeout);
            this.heartbeats.delete(socketId);
            logger.debug({ socketId }, 'Heartbeat stopped');
        }
    }
    handlePong(socketId) {
        connectionManager.updateActivity(socketId);
        const existingTimeout = this.heartbeats.get(socketId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        const newTimeout = setTimeout(() => {
            logger.warn({ socketId }, 'Heartbeat timeout after pong - disconnecting socket');
            this.stopHeartbeat(socketId);
        }, wsConfig.pingTimeout);
        this.heartbeats.set(socketId, newTimeout);
    }
    getActiveHeartbeatCount() {
        return this.heartbeats.size;
    }
}
export const heartbeatManager = new HeartbeatManager();
//# sourceMappingURL=heartbeat.manager.js.map