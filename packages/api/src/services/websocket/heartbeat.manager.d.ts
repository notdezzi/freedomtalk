import { Socket } from 'socket.io';
declare class HeartbeatManager {
    private heartbeats;
    startHeartbeat(socket: Socket): void;
    stopHeartbeat(socketId: string): void;
    handlePong(socketId: string): void;
    getActiveHeartbeatCount(): number;
}
export declare const heartbeatManager: HeartbeatManager;
export {};
//# sourceMappingURL=heartbeat.manager.d.ts.map