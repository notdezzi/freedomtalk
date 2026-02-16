import { ZodError } from 'zod';
import { ApiError, ApiErrorCode } from '../types/api.types';
import { errorResponse, genericErrorResponse, validationErrorResponse } from '../utils/errors';
import { logger } from '../config/logger';
export async function errorHandler(error, request, reply) {
    const requestId = request.id;
    logger.error({
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
        },
        requestId,
        method: request.method,
        url: request.url,
        ip: request.ip,
    }, 'Request error');
    if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
        }));
        reply.status(400).send(validationErrorResponse(formattedErrors, requestId));
        return;
    }
    if (error instanceof ApiError) {
        reply.status(error.statusCode).send(errorResponse(error, requestId));
        return;
    }
    if ('statusCode' in error && error.statusCode) {
        const fastifyError = error;
        let apiErrorCode = ApiErrorCode.INTERNAL_SERVER_ERROR;
        if (fastifyError.statusCode === 400 && (fastifyError.code === 'FST_ERR_VALIDATION' || fastifyError.validation)) {
            apiErrorCode = ApiErrorCode.VALIDATION_ERROR;
        }
        else if (fastifyError.statusCode === 400) {
            apiErrorCode = ApiErrorCode.INVALID_INPUT;
        }
        if (fastifyError.statusCode === 401)
            apiErrorCode = ApiErrorCode.UNAUTHORIZED;
        if (fastifyError.statusCode === 403)
            apiErrorCode = ApiErrorCode.FORBIDDEN;
        if (fastifyError.statusCode === 404)
            apiErrorCode = ApiErrorCode.NOT_FOUND;
        if (fastifyError.statusCode === 429)
            apiErrorCode = ApiErrorCode.RATE_LIMIT_EXCEEDED;
        reply.status(fastifyError.statusCode || 500).send(genericErrorResponse(fastifyError.message, apiErrorCode, requestId));
        return;
    }
    reply.status(500).send(genericErrorResponse(process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message, ApiErrorCode.INTERNAL_SERVER_ERROR, requestId));
}
export async function notFoundHandler(request, reply) {
    reply.status(404).send(genericErrorResponse(`Route ${request.method} ${request.url} not found`, ApiErrorCode.NOT_FOUND, request.id));
}
//# sourceMappingURL=error.middleware.js.map