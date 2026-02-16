import { Socket } from 'socket.io';
export interface AuthUser {
    id: string;
    email: string;
    username: string;
    emailVerified: boolean;
    mfaEnabled: boolean;
    accountStatus: string;
}
declare module 'socket.io' {
    interface SocketData {
        user?: AuthUser;
    }
}
export declare function authenticateSocket(socket: Socket, next: (err?: Error) => void): Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map