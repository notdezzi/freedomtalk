import { ZodError } from 'zod';
import { ValidationError } from '../types/api.types';
export function validateBody(schema) {
    return async (request, _reply) => {
        try {
            request.body = schema.parse(request.body);
        }
        catch (error) {
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
export function validateQuery(schema) {
    return async (request, _reply) => {
        try {
            request.query = schema.parse(request.query);
        }
        catch (error) {
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
export function validateParams(schema) {
    return async (request, _reply) => {
        try {
            request.params = schema.parse(request.params);
        }
        catch (error) {
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
//# sourceMappingURL=validation.middleware.js.map