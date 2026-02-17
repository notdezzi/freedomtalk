import { Socket } from "socket.io-client";
interface UseWebSocketOptions {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
}
export declare function useWebSocket(options?: UseWebSocketOptions): {
    socket: Socket<import("@socket.io/component-emitter").DefaultEventsMap, import("@socket.io/component-emitter").DefaultEventsMap> | null;
    isConnected: boolean;
    subscribe: (event: string, callback: (...args: unknown[]) => void) => void;
    unsubscribe: (event: string, callback?: (...args: unknown[]) => void) => void;
    emit: (event: string, data: unknown) => void;
    joinRoom: (room: string) => void;
    leaveRoom: (room: string) => void;
};
export declare function getSocket(): Socket | null;
export declare function initSocket(): Socket;
export declare function disconnectSocket(): void;
export {};
//# sourceMappingURL=useWebSocket.d.ts.map