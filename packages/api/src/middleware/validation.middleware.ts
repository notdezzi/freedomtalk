/**
 * Validation Middleware
 * Zod schema validation for request bodies
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../types/api.types';

/**
 * Validate request body against Zod schema
 * @param schema - Zod schema to validate against
 * @returns Fastify preHandler hook
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      // Log the incoming body for debugging
      console.log('[Validation] Body received:', JSON.stringify(request.body, null, 2));
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        // Log the validation errors and the body that failed
        console.log('[Validation] Errors:', JSON.stringify(formattedErrors, null, 2));
        request.log.error({ errors: formattedErrors, body: request.body }, 'Validation failed');
        throw new ValidationError('Validation failed', formattedErrors);
      }
      throw error;
    }
  };
}

/**
 * Validate request query parameters against Zod schema
 * @param schema - Zod schema to validate against
 * @returns Fastify preHandler hook
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new ValidationError('Query validation failed', formattedErrors);
      }
      throw error;
    }
  };
}

/**
 * Validate request params against Zod schema
 * @param schema - Zod schema to validate against
 * @returns Fastify preHandler hook
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new ValidationError('Params validation failed', formattedErrors);
      }
      throw error;
    }
  };
}

