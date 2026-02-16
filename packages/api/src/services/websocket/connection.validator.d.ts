import { Socket } from 'socket.io';
import { AuthUser } from './auth.middleware';
export interface ValidationResult {
    success: boolean;
    error?: string;
    code?: string;
}
declare class ConnectionValidator {
    private readonly MAX_CONNECTIONS_PER_IP;
    private readonly RATE_LIMIT_WINDOW;
    validateConnection(socket: Socket, user: AuthUser): Promise<ValidationResult>;
    private validateAccountStatus;
    private validateConnectionLimits;
    private validateIPRateLimit;
    private validateMetadata;
    private extractIP;
}
export declare const connectionValidator: ConnectionValidator;
export {};
//# sourceMappingURL=connection.validator.d.ts.map