import { Socket } from 'socket.io';
import { jwtService } from '../auth/jwt.service';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';

/**
 * User object attached to socket
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
 * Extend Socket.io socket data to include user
 */
declare module 'socket.io' {
  interface SocketData {
    user?: AuthUser;
  }
}

/**
 * Extract JWT token from socket handshake
 * @param socket - Socket instance
 * @returns JWT token or null
 */
function extractToken(socket: Socket): string | null {
  // Try auth.token first (recommended)
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }

  // Try Authorization header
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1] || null;
    }
  }

  // Try query parameter (fallback for some clients)
  if (socket.handshake.query?.token && typeof socket.handshake.query.token === 'string') {
    return socket.handshake.query.token;
  }

  return null;
}

/**
 * Load user from database
 * @param userId - User ID
 * @returns User object or null
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
    logger.error({ error, userId }, 'Error loading user for WebSocket authentication');
    return null;
  }
}

/**
 * WebSocket authentication middleware
 * Validates JWT token and attaches user to socket
 * @param socket - Socket instance
 * @param next - Next middleware function
 */
export async function authenticateSocket(socket: Socket, next: (err?: Error) => void): Promise<void> {
  try {
    // Extract token
    const token = extractToken(socket);
    if (!token) {
      logger.warn({ socketId: socket.id }, 'WebSocket connection attempt without token');
      socket.emit(WS_EVENTS.AUTHENTICATION_ERROR, {
        code: 'TOKEN_MISSING',
        message: 'Authentication token required',
      });
      return next(new Error('Authentication token required'));
    }

    // Verify token
    let payload;
    try {
      payload = await jwtService.verifyToken(token);
    } catch (error) {
      logger.warn({ socketId: socket.id, error }, 'Invalid WebSocket authentication token');
      socket.emit(WS_EVENTS.AUTHENTICATION_ERROR, {
        code: 'TOKEN_INVALID',
        message: 'Invalid or expired authentication token',
      });
      return next(new Error('Invalid or expired authentication token'));
    }

    // Load user
    const user = await loadUser(payload.userId);
    if (!user) {
      logger.warn({ socketId: socket.id, userId: payload.userId }, 'User not found for WebSocket connection');
      socket.emit(WS_EVENTS.AUTHENTICATION_ERROR, {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
      return next(new Error('User not found'));
    }

    // Validate account status
    if (user.accountStatus !== 'active') {
      logger.warn({ socketId: socket.id, userId: user.id, accountStatus: user.accountStatus }, 'Inactive account attempted WebSocket connection');
      socket.emit(WS_EVENTS.AUTHENTICATION_ERROR, {
        code: 'ACCOUNT_INACTIVE',
        message: `Account is ${user.accountStatus}`,
      });
      return next(new Error(`Account is ${user.accountStatus}`));
    }

    // Attach user to socket
    socket.data.user = user;

    logger.info({ socketId: socket.id, userId: user.id, username: user.username }, 'WebSocket authenticated successfully');
    next();
  } catch (error) {
    logger.error({ socketId: socket.id, error }, 'Error in WebSocket authentication middleware');
    socket.emit(WS_EVENTS.AUTHENTICATION_ERROR, {
      code: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed',
    });
    next(new Error('Authentication failed'));
  }
}

