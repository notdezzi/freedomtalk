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
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
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

