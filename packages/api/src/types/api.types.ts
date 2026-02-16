/**
 * API Type Definitions
 * Standardized error codes and types for API responses
 */

import { ApiResponse } from '@freedomtalk/shared';

/**
 * Standard API error codes
 */
export enum ApiErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  
  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors (404, 409)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // OAuth2 errors
  OAUTH2_ERROR = 'OAUTH2_ERROR',
  OAUTH2_STATE_INVALID = 'OAUTH2_STATE_INVALID',
  OAUTH2_REDIRECT_INVALID = 'OAUTH2_REDIRECT_INVALID',
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public override message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error class
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(ApiErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication Error class
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required', code: ApiErrorCode = ApiErrorCode.UNAUTHORIZED) {
    super(code, message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error class
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(ApiErrorCode.FORBIDDEN, message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error class
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(ApiErrorCode.NOT_FOUND, `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error class
 */
export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(ApiErrorCode.CONFLICT, message, 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Rate Limit Error class
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(ApiErrorCode.RATE_LIMIT_EXCEEDED, message, 429);
    this.name = 'RateLimitError';
  }
}

// Re-export ApiResponse type for convenience
export type { ApiResponse };

