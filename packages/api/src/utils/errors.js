import { ApiErrorCode } from '../types/api.types';
export function successResponse(data, meta) {
    return {
        success: true,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            ...meta,
        },
    };
}
export function errorResponse(error, requestId) {
    return {
        success: false,
        error: {
            code: error.code,
            message: error.message,
            details: error.details,
        },
        meta: {
            timestamp: new Date().toISOString(),
            requestId,
        },
    };
}
export function genericErrorResponse(message, code = ApiErrorCode.INTERNAL_SERVER_ERROR, requestId) {
    return {
        success: false,
        error: {
            code,
            message,
        },
        meta: {
            timestamp: new Date().toISOString(),
            requestId,
        },
    };
}
export function validationErrorResponse(errors, requestId) {
    return {
        success: false,
        error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Validation failed',
            details: errors,
        },
        meta: {
            timestamp: new Date().toISOString(),
            requestId,
        },
    };
}
//# sourceMappingURL=errors.js.map