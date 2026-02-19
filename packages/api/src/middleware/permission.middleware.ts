/**
 * Permission Middleware
 *
 * Factory functions that create Fastify middleware for permission-based route protection.
 * Uses the PermissionService to check permissions before allowing access to routes.
 *
 * Usage:
 * ```typescript
 * app.delete('/servers/:serverId', {
 *   onRequest: [authenticate, requireServerPermission(PERMISSION_FLAGS.MANAGE_SERVER)],
 * }, handler);
 * ```
 */

import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { permissionService } from '../services/permission';
import { PERMISSION_FLAGS, PERMISSION_NAMES } from '@freedomtalk/shared';
import { genericErrorResponse } from '../utils/errors';
import { ApiErrorCode } from '../types/api.types';
import { logger } from '../config/logger';
import { db } from '../config/database';

/**
 * Permission flag type for type safety
 */
type PermissionFlag = (typeof PERMISSION_FLAGS)[keyof typeof PERMISSION_FLAGS];

/**
 * Get the name of a permission flag for error messages
 */
function getPermissionName(permission: bigint): string {
  for (const [key, value] of Object.entries(PERMISSION_FLAGS)) {
    if (value === permission) {
      return PERMISSION_NAMES[key as keyof typeof PERMISSION_NAMES] || key;
    }
  }
  return 'Unknown Permission';
}

/**
 * Check if a user is a member of a server
 */
async function isServerMember(userId: string, serverId: string): Promise<boolean> {
  const member = await db('server_members')
    .where('server_id', serverId)
    .where('user_id', userId)
    .first();
  return !!member;
}

/**
 * Check if a server exists
 */
async function serverExists(serverId: string): Promise<boolean> {
  const server = await db('servers').where('id', serverId).first();
  return !!server;
}

/**
 * Check if a channel exists and get its server_id
 */
async function getChannelServerId(channelId: string): Promise<string | null> {
  const channel = await db('channels')
    .select('server_id')
    .where('id', channelId)
    .first();
  return channel?.server_id || null;
}

/**
 * Middleware factory that checks if user has a server permission.
 * Throws 403 Forbidden if permission is denied.
 *
 * @param permission - The permission flag to check (e.g., PERMISSION_FLAGS.MANAGE_SERVER)
 * @returns Fastify middleware function
 *
 * @example
 * ```typescript
 * app.delete('/servers/:serverId', {
 *   onRequest: [authenticate, requireServerPermission(PERMISSION_FLAGS.MANAGE_SERVER)],
 * }, async (req, reply) => {
 *   // Only users with MANAGE_SERVER can access
 * });
 * ```
 */
export function requireServerPermission(permission: PermissionFlag) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      // Get userId from authenticated request
      const userId = req.user?.id;
      if (!userId) {
        // This should be caught by authenticate middleware first
        logger.warn('requireServerPermission called without authenticated user');
        return reply.status(401).send(
          genericErrorResponse('Authentication required', ApiErrorCode.UNAUTHORIZED, req.id)
        );
      }

      // Get serverId from request params
      const serverId = (req.params as Record<string, string>).serverId;
      if (!serverId) {
        return reply.status(400).send(
          genericErrorResponse('Server ID is required', ApiErrorCode.MISSING_REQUIRED_FIELD, req.id)
        );
      }

      // Check if server exists
      const exists = await serverExists(serverId);
      if (!exists) {
        return reply.status(404).send(
          genericErrorResponse('Server not found', ApiErrorCode.NOT_FOUND, req.id)
        );
      }

      // Check if user is a member of the server
      const isMember = await isServerMember(userId, serverId);
      if (!isMember) {
        return reply.status(403).send(
          genericErrorResponse('You are not a member of this server', ApiErrorCode.FORBIDDEN, req.id)
        );
      }

      // Check permission using PermissionService
      const hasPermission = await permissionService.hasPermission(userId, serverId, permission);
      if (!hasPermission) {
        const permissionName = getPermissionName(permission);
        logger.debug({ userId, serverId, permission: permissionName }, 'Server permission denied');
        return reply.status(403).send(
          genericErrorResponse(
            `Missing permission: ${permissionName}`,
            ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            req.id
          )
        );
      }

      // Permission granted - continue to route handler
    } catch (error) {
      logger.error({ error, path: req.url }, 'Error in requireServerPermission middleware');
      return reply.status(500).send(
        genericErrorResponse('Internal server error', ApiErrorCode.INTERNAL_SERVER_ERROR, req.id)
      );
    }
  };
}

/**
 * Middleware factory that checks if user has a channel permission.
 * Throws 403 Forbidden if permission is denied.
 * Also validates that the channel exists and user is a server member.
 *
 * @param permission - The permission flag to check (e.g., PERMISSION_FLAGS.SEND_MESSAGES)
 * @returns Fastify middleware function
 *
 * @example
 * ```typescript
 * app.post('/channels/:channelId/messages', {
 *   onRequest: [authenticate, requireChannelPermission(PERMISSION_FLAGS.SEND_MESSAGES)],
 * }, async (req, reply) => {
 *   // Only users with SEND_MESSAGES in this channel can access
 * });
 * ```
 */
export function requireChannelPermission(permission: PermissionFlag) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      // Get userId from authenticated request
      const userId = req.user?.id;
      if (!userId) {
        // This should be caught by authenticate middleware first
        logger.warn('requireChannelPermission called without authenticated user');
        return reply.status(401).send(
          genericErrorResponse('Authentication required', ApiErrorCode.UNAUTHORIZED, req.id)
        );
      }

      // Get channelId from request params
      const channelId = (req.params as Record<string, string>).channelId;
      if (!channelId) {
        return reply.status(400).send(
          genericErrorResponse('Channel ID is required', ApiErrorCode.MISSING_REQUIRED_FIELD, req.id)
        );
      }

      // Check if channel exists and get server_id
      const serverId = await getChannelServerId(channelId);
      if (!serverId) {
        return reply.status(404).send(
          genericErrorResponse('Channel not found', ApiErrorCode.NOT_FOUND, req.id)
        );
      }

      // Check if user is a member of the server
      const isMember = await isServerMember(userId, serverId);
      if (!isMember) {
        return reply.status(403).send(
          genericErrorResponse('You are not a member of this server', ApiErrorCode.FORBIDDEN, req.id)
        );
      }

      // Check permission using PermissionService
      const hasPermission = await permissionService.hasChannelPermission(userId, channelId, permission);
      if (!hasPermission) {
        const permissionName = getPermissionName(permission);
        logger.debug({ userId, channelId, permission: permissionName }, 'Channel permission denied');
        return reply.status(403).send(
          genericErrorResponse(
            `Missing permission: ${permissionName} in this channel`,
            ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            req.id
          )
        );
      }

      // Permission granted - continue to route handler
    } catch (error) {
      logger.error({ error, path: req.url }, 'Error in requireChannelPermission middleware');
      return reply.status(500).send(
        genericErrorResponse('Internal server error', ApiErrorCode.INTERNAL_SERVER_ERROR, req.id)
      );
    }
  };
}

/**
 * Helper to attach permission service to request for use in routes.
 * This allows route handlers to perform additional permission checks.
 *
 * @example
 * ```typescript
 * app.get('/servers/:serverId/permissions', {
 *   onRequest: [authenticate, attachPermissionService],
 * }, async (req, reply) => {
 *   const canManage = await req.permissionService.hasPermission(
 *     req.user.id,
 *     req.params.serverId,
 *     PERMISSION_FLAGS.MANAGE_SERVER
 *   );
 * });
 * ```
 */
export async function attachPermissionService(
  req: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  // Attach permission service to request for custom permission checks
  (req as any).permissionService = permissionService;
}

/**
 * Type augmentation for request with permission service
 */
declare module 'fastify' {
  interface FastifyRequest {
    permissionService?: typeof permissionService;
  }
}

/**
 * Fastify plugin to decorate the Fastify instance with permission helpers.
 * This adds utility methods to the app instance for permission checking.
 *
 * @example
 * ```typescript
 * // In app setup
 * await app.register(permissionPlugin);
 *
 * // Then in routes
 * app.get('/protected', async (req, reply) => {
 *   const hasPermission = await app.hasServerPermission(req.user.id, serverId, permission);
 * });
 * ```
 */
export async function permissionPlugin(app: FastifyInstance): Promise<void> {
  // Decorate the app with permission checking methods
  app.decorate('hasServerPermission', async function (
    userId: string,
    serverId: string,
    permission: bigint
  ): Promise<boolean> {
    return permissionService.hasPermission(userId, serverId, permission);
  });

  app.decorate('hasChannelPermission', async function (
    userId: string,
    channelId: string,
    permission: bigint
  ): Promise<boolean> {
    return permissionService.hasChannelPermission(userId, channelId, permission);
  });

  app.decorate('getPermissionBreakdown', async function (
    userId: string,
    serverId: string
  ) {
    return permissionService.getPermissionBreakdown(userId, serverId);
  });

  app.decorate('getChannelPermissionBreakdown', async function (
    userId: string,
    channelId: string
  ) {
    return permissionService.getChannelPermissionBreakdown(userId, channelId);
  });

  logger.debug('Permission plugin registered');
}

/**
 * Augment FastifyInstance with permission methods
 */
declare module 'fastify' {
  interface FastifyInstance {
    hasServerPermission?(userId: string, serverId: string, permission: bigint): Promise<boolean>;
    hasChannelPermission?(userId: string, channelId: string, permission: bigint): Promise<boolean>;
    getPermissionBreakdown?(userId: string, serverId: string): Promise<any>;
    getChannelPermissionBreakdown?(userId: string, channelId: string): Promise<any>;
  }
}

/**
 * Convenience object for importing common middleware combinations
 */
export const permissionMiddleware = {
  requireServerPermission,
  requireChannelPermission,
  attachPermissionService,
  permissionPlugin,
};
