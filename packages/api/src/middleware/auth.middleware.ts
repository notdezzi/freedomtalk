/**
 * Authentication Middleware
 * 
 * Provides JWT-based authentication middleware for Fastify routes.
 * Supports token extraction from headers and cookies, MFA verification,
 * and optional authentication for public routes.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { jwtService } from '../services/auth/jwt.service';
import { sessionService } from '../services/auth/session.service';
import { db } from '../config/database';
import { logger } from '../config/logger';
import { ApiErrorCode } from '../types/api.types';
import { genericErrorResponse } from '../utils/errors';

/**
 * User object attached to request
 */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  accountStatus: string;
}

/**
 * Extend Fastify request to include user
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    sessionId?: string;
  }
}

/**
 * Extract JWT token from request
 * Checks Authorization header (Bearer token) and cookies (access_token)
 */
function extractToken(request: FastifyRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  const cookieToken = request.cookies?.access_token;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Load user from database with caching
 */
async function loadUser(userId: string): Promise<AuthUser | null> {
  try {
    const user = await db('users')
      .where({ id: userId })
      .select('id', 'email', 'username', 'email_verified', 'mfa_enabled', 'account_status')
      .first();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.email_verified,
      mfaEnabled: user.mfa_enabled,
      accountStatus: user.account_status,
    };
  } catch (error) {
    logger.error({ error, userId }, 'Error loading user');
    return null;
  }
}

/**
 * Require authentication middleware
 * Returns 401 if not authenticated or MFA required
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract token
    const token = extractToken(request);
    if (!token) {
      return reply.status(401).send(
        genericErrorResponse('Authentication required', ApiErrorCode.UNAUTHORIZED, request.id)
      );
    }

    // Verify token
    let payload;
    try {
      payload = await jwtService.verifyToken(token);
    } catch (error) {
      logger.warn({ error }, 'Invalid or expired token');
      return reply.status(401).send(
        genericErrorResponse('Invalid or expired token', ApiErrorCode.UNAUTHORIZED, request.id)
      );
    }

    // Load user
    const user = await loadUser(payload.userId);
    if (!user) {
      return reply.status(401).send(
        genericErrorResponse('User not found', ApiErrorCode.UNAUTHORIZED, request.id)
      );
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return reply.status(401).send(
        genericErrorResponse('Account is not active', ApiErrorCode.UNAUTHORIZED, request.id)
      );
    }

    // Attach user to request
    request.user = user;

    // MFA INTEGRATION: Check if MFA is required
    if (user.mfaEnabled) {
      // If MFA is enabled, sessionId MUST be present in the token
      if (!payload.sessionId) {
        return reply.status(401).send(
          genericErrorResponse('MFA verification required', ApiErrorCode.UNAUTHORIZED, request.id)
        );
      }

      // Get session to check MFA verification status
      const session = await sessionService.getSession(payload.sessionId);

      if (!session || !session.mfaVerified) {
        return reply.status(401).send(
          genericErrorResponse('MFA verification required', ApiErrorCode.UNAUTHORIZED, request.id)
        );
      }

      // Attach session ID to request
      request.sessionId = payload.sessionId;
    }

    // Authentication successful
  } catch (error) {
    logger.error({ error }, 'Error in requireAuth middleware');
    return reply.status(500).send({
      error: 'internal_error',
      message: 'Internal server error',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user to request if authenticated, but doesn't require it
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    // Extract token
    const token = extractToken(request);
    if (!token) {
      // No token, continue without authentication
      return;
    }

    // Verify token
    let payload;
    try {
      payload = await jwtService.verifyToken(token);
    } catch (error) {
      // Invalid token, continue without authentication
      logger.debug({ error }, 'Invalid token in optionalAuth');
      return;
    }

    // Load user
    const user = await loadUser(payload.userId);
    if (!user || user.accountStatus !== 'active') {
      // User not found or inactive, continue without authentication
      return;
    }

    // Attach user to request
    request.user = user;

    // Attach session ID if present
    if (payload.sessionId) {
      request.sessionId = payload.sessionId;
    }
  } catch (error) {
    logger.error({ error }, 'Error in optionalAuth middleware');
    // Continue without authentication on error
  }
}

