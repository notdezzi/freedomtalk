export interface ConnectionMetadata {
    userId: string;
    socketId: string;
    connectedAt: Date;
    lastActivity: Date;
}
declare class ConnectionManager {
    private connections;
    private userConnections;
    addConnection(socketId: string, userId: string): void;
    removeConnection(socketId: string): void;
    getUserConnections(userId: string): string[];
    getConnectionCount(): number;
    getUserConnectionCount(userId: string): number;
    updateActivity(socketId: string): void;
    getConnection(socketId: string): ConnectionMetadata | undefined;
    getAllConnections(): ConnectionMetadata[];
}
export declare const connectionManager: ConnectionManager;
export {};
//# sourceMappingURL=connection.manager.d.ts.map