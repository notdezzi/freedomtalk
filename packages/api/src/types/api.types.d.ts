import { ApiResponse } from '@freedomtalk/shared';
export declare enum ApiErrorCode {
    UNAUTHORIZED = "UNAUTHORIZED",
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    TOKEN_INVALID = "TOKEN_INVALID",
    TOKEN_REVOKED = "TOKEN_REVOKED",
    FORBIDDEN = "FORBIDDEN",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INVALID_INPUT = "INVALID_INPUT",
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
    NOT_FOUND = "NOT_FOUND",
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
    CONFLICT = "CONFLICT",
    DUPLICATE_RESOURCE = "DUPLICATE_RESOURCE",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    STORAGE_ERROR = "STORAGE_ERROR",
    OAUTH2_ERROR = "OAUTH2_ERROR",
    OAUTH2_STATE_INVALID = "OAUTH2_STATE_INVALID",
    OAUTH2_REDIRECT_INVALID = "OAUTH2_REDIRECT_INVALID"
}
export declare class ApiError extends Error {
    code: ApiErrorCode;
    message: string;
    statusCode: number;
    details?: any | undefined;
    constructor(code: ApiErrorCode, message: string, statusCode?: number, details?: any | undefined);
}
export declare class ValidationError extends ApiError {
    constructor(message: string, details?: any);
}
export declare class AuthenticationError extends ApiError {
    constructor(message?: string, code?: ApiErrorCode);
}
export declare class AuthorizationError extends ApiError {
    constructor(message?: string);
}
export declare class NotFoundError extends ApiError {
    constructor(resource?: string);
}
export declare class ConflictError extends ApiError {
    constructor(message: string, details?: any);
}
export declare class RateLimitError extends ApiError {
    constructor(message?: string);
}
export type { ApiResponse };
//# sourceMappingURL=api.types.d.ts.map