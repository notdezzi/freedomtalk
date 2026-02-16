import { Socket } from 'socket.io';
export declare function handleRoomJoin(socket: Socket, data: unknown): Promise<void>;
export declare function handleRoomLeave(socket: Socket, data: unknown): Promise<void>;
export declare function handleSubscriptionSync(socket: Socket): Promise<void>;
//# sourceMappingURL=room.handler.d.ts.map