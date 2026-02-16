/**
 * CSRF Protection Utilities
 * 
 * Provides CSRF token generation and validation using double-submit cookie pattern.
 */

import crypto from 'crypto';
import { logger } from '../config/logger';

/**
 * Generate CSRF token
 * @returns Random CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token using timing-safe comparison
 * @param cookieToken - Token from cookie
 * @param headerToken - Token from header
 * @returns True if tokens match, false otherwise
 */
export function validateCsrfToken(cookieToken: string | undefined, headerToken: string | undefined): boolean {
  if (!cookieToken || !headerToken) {
    logger.warn('Missing CSRF token in cookie or header');
    return false;
  }

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  } catch (error) {
    // Tokens are different lengths or invalid
    logger.warn({ error }, 'CSRF token validation failed');
    return false;
  }
}

