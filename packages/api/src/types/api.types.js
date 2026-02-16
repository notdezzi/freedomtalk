export var ApiErrorCode;
(function (ApiErrorCode) {
    ApiErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ApiErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    ApiErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ApiErrorCode["TOKEN_INVALID"] = "TOKEN_INVALID";
    ApiErrorCode["TOKEN_REVOKED"] = "TOKEN_REVOKED";
    ApiErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ApiErrorCode["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    ApiErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ApiErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ApiErrorCode["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    ApiErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ApiErrorCode["RESOURCE_NOT_FOUND"] = "RESOURCE_NOT_FOUND";
    ApiErrorCode["CONFLICT"] = "CONFLICT";
    ApiErrorCode["DUPLICATE_RESOURCE"] = "DUPLICATE_RESOURCE";
    ApiErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    ApiErrorCode["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ApiErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ApiErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
    ApiErrorCode["STORAGE_ERROR"] = "STORAGE_ERROR";
    ApiErrorCode["OAUTH2_ERROR"] = "OAUTH2_ERROR";
    ApiErrorCode["OAUTH2_STATE_INVALID"] = "OAUTH2_STATE_INVALID";
    ApiErrorCode["OAUTH2_REDIRECT_INVALID"] = "OAUTH2_REDIRECT_INVALID";
})(ApiErrorCode || (ApiErrorCode = {}));
export class ApiError extends Error {
    code;
    message;
    statusCode;
    details;
    constructor(code, message, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'ApiError';
        Error.captureStackTrace(this, this.constructor);
    }
}
export class ValidationError extends ApiError {
    constructor(message, details) {
        super(ApiErrorCode.VALIDATION_ERROR, message, 400, details);
        this.name = 'ValidationError';
    }
}
export class AuthenticationError extends ApiError {
    constructor(message = 'Authentication required', code = ApiErrorCode.UNAUTHORIZED) {
        super(code, message, 401);
        this.name = 'AuthenticationError';
    }
}
export class AuthorizationError extends ApiError {
    constructor(message = 'Insufficient permissions') {
        super(ApiErrorCode.FORBIDDEN, message, 403);
        this.name = 'AuthorizationError';
    }
}
export class NotFoundError extends ApiError {
    constructor(resource = 'Resource') {
        super(ApiErrorCode.NOT_FOUND, `${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}
export class ConflictError extends ApiError {
    constructor(message, details) {
        super(ApiErrorCode.CONFLICT, message, 409, details);
        this.name = 'ConflictError';
    }
}
export class RateLimitError extends ApiError {
    constructor(message = 'Rate limit exceeded') {
        super(ApiErrorCode.RATE_LIMIT_EXCEEDED, message, 429);
        this.name = 'RateLimitError';
    }
}
//# sourceMappingURL=api.types.js.map