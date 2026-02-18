/**
 * Global Error Handler Middleware
 * Catches all errors and returns standardized error responses
 */

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ApiError, ApiErrorCode } from '../types/api.types';
import { errorResponse, genericErrorResponse, validationErrorResponse } from '../utils/errors';
import { logger } from '../config/logger';
import { captureException } from '../config/sentry';

/**
 * Global error handler
 * Transforms all errors into standardized ApiResponse format
 */
export async function errorHandler(
  error: Error | FastifyError | ApiError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const requestId = request.id;

  // Log error with context
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

  // Capture error with Sentry (only 5xx errors or unexpected errors)
  const statusCode = 'statusCode' in error ? (error as FastifyError).statusCode : 500;
  if (!statusCode || statusCode >= 500) {
    captureException(error, {
      requestId,
      method: request.method,
      url: request.url,
      ip: request.ip,
    });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    reply.status(400).send(validationErrorResponse(formattedErrors, requestId));
    return;
  }

  // Handle custom ApiError
  if (error instanceof ApiError) {
    reply.status(error.statusCode).send(errorResponse(error, requestId));
    return;
  }

  // Handle Fastify errors
  if ('statusCode' in error && error.statusCode) {
    const fastifyError = error as FastifyError;

    // Map Fastify error codes to ApiErrorCode
    let apiErrorCode = ApiErrorCode.INTERNAL_SERVER_ERROR;
    // Check if it's a validation error (Fastify schema validation)
    if (fastifyError.statusCode === 400 && (fastifyError.code === 'FST_ERR_VALIDATION' || fastifyError.validation)) {
      apiErrorCode = ApiErrorCode.VALIDATION_ERROR;
    } else if (fastifyError.statusCode === 400) {
      apiErrorCode = ApiErrorCode.INVALID_INPUT;
    }
    if (fastifyError.statusCode === 401) apiErrorCode = ApiErrorCode.UNAUTHORIZED;
    if (fastifyError.statusCode === 403) apiErrorCode = ApiErrorCode.FORBIDDEN;
    if (fastifyError.statusCode === 404) apiErrorCode = ApiErrorCode.NOT_FOUND;
    if (fastifyError.statusCode === 429) apiErrorCode = ApiErrorCode.RATE_LIMIT_EXCEEDED;

    reply.status(fastifyError.statusCode || 500).send(
      genericErrorResponse(fastifyError.message, apiErrorCode, requestId)
    );
    return;
  }

  // Handle unknown errors
  reply.status(500).send(
    genericErrorResponse(
      process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      requestId
    )
  );
}

/**
 * Not Found handler (404)
 */
export async function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(404).send(
    genericErrorResponse(
      `Route ${request.method} ${request.url} not found`,
      ApiErrorCode.NOT_FOUND,
      request.id
    )
  );
}

