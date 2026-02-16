export interface WebSocketConfig {
    cors: {
        origin: string | string[] | boolean;
        credentials: boolean;
    };
    pingInterval: number;
    pingTimeout: number;
    maxConnections: number;
    maxConnectionsPerUser: number;
}
export declare const wsConfig: WebSocketConfig;
export declare const createRedisAdapter: () => (nsp: any) => import("@socket.io/redis-adapter").RedisAdapter;
//# sourceMappingURL=websocket.d.ts.map