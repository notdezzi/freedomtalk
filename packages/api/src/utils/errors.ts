/**
 * Error Response Utilities
 * Helper functions for building standardized API responses
 */

import { ApiResponse } from '@freedomtalk/shared';
import { ApiError, ApiErrorCode } from '../types/api.types';

/**
 * Custom App Error class
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

/**
 * Build success response
 */
export function successResponse<T>(data: T, meta?: any): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Build error response from ApiError
 */
export function errorResponse(error: ApiError, requestId?: string): ApiResponse {
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

/**
 * Build error response from generic error
 */
export function genericErrorResponse(message: string, code: ApiErrorCode = ApiErrorCode.INTERNAL_SERVER_ERROR, requestId?: string): ApiResponse {
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

/**
 * Build validation error response
 */
export function validationErrorResponse(errors: any, requestId?: string): ApiResponse {
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

