import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
declare class WebSocketServer {
    private io;
    private initialized;
    initialize(httpServer: HTTPServer): Promise<void>;
    getIO(): SocketIOServer;
    isInitialized(): boolean;
    close(): Promise<void>;
}
export declare const wsServer: WebSocketServer;
export {};
//# sourceMappingURL=websocket.server.d.ts.map