import { Socket } from 'socket.io';
export declare function handlePresenceUpdate(socket: Socket): Promise<void>;
export declare function handleStatusChange(socket: Socket, data: unknown): Promise<void>;
export declare function handleTypingStart(socket: Socket, data: unknown): Promise<void>;
export declare function handleTypingStop(socket: Socket, data: unknown): Promise<void>;
//# sourceMappingURL=presence.handler.d.ts.map