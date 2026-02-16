import { Socket } from 'socket.io';
export declare function handleConnection(socket: Socket): Promise<void>;
export declare function handleDisconnect(socket: Socket): Promise<void>;
export declare function handlePing(socket: Socket): Promise<void>;
export declare function handlePong(socket: Socket): void;
//# sourceMappingURL=connection.handler.d.ts.map