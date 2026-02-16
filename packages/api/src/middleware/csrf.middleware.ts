/**
 * CSRF Protection Middleware
 * 
 * Implements double-submit cookie pattern for CSRF protection.
 * Validates CSRF tokens on state-changing requests (POST, PUT, PATCH, DELETE).
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { generateCsrfToken, validateCsrfToken } from '../utils/csrf';
import { logger } from '../config/logger';

/**
 * CSRF cookie name
 */
const CSRF_COOKIE_NAME = 'csrf_token';

/**
 * CSRF header name
 */
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Methods that require CSRF protection
 */
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Generate and set CSRF token cookie
 * Call this on GET requests to provide token to client
 */
export async function setCsrfToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Check if CSRF token already exists
  let csrfToken = request.cookies?.[CSRF_COOKIE_NAME];

  // Generate new token if not exists
  if (!csrfToken) {
    csrfToken = generateCsrfToken();

    // Set CSRF token cookie
    reply.setCookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false, // Allow JavaScript access to read token
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Strict same-site policy
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    logger.debug('CSRF token generated and set in cookie');
  }
}

/**
 * Validate CSRF token middleware
 * Validates token on state-changing requests
 */
export async function validateCsrf(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip validation for safe methods
  if (!PROTECTED_METHODS.includes(request.method)) {
    return;
  }

  // Get tokens from cookie and header
  const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = request.headers[CSRF_HEADER_NAME] as string | undefined;

  // Validate tokens
  const isValid = validateCsrfToken(cookieToken, headerToken);

  if (!isValid) {
    logger.warn(
      {
        method: request.method,
        url: request.url,
        ip: request.ip,
      },
      'CSRF validation failed'
    );

    return reply.status(403).send({
      error: 'csrf_validation_failed',
      message: 'CSRF token validation failed',
    });
  }

  // Validation successful
  logger.debug('CSRF token validated successfully');
}

/**
 * Combined CSRF middleware
 * Sets token on GET requests, validates on state-changing requests
 */
export async function csrfProtection(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.method === 'GET') {
    await setCsrfToken(request, reply);
  } else if (PROTECTED_METHODS.includes(request.method)) {
    await validateCsrf(request, reply);
  }
}

