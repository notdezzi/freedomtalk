/**
 * Permission Routes
 * Handles permission overwrite management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { successResponse } from '../../utils/errors';
import { permissionService } from '../../services/permission/permission.service';
import { channelService } from '../../services/channel/channel.service';
import { serverService } from '../../services/server/server.service';
import { roleService } from '../../services/server/role.service';
import { PERMISSION_FLAGS, PermissionOverwriteType } from '@freedomtalk/shared';

// Validation schemas
const overwriteSchema = z.object({
  allow: z.string().optional(),
  deny: z.string().optional(),
});

const permissionCheckSchema = z.object({
  permissions: z.array(z.string()),
});

// Permission check helper using the new permission service
async function checkServerPermission(
  serverId: string,
  userId: string,
  permission: bigint
): Promise<boolean> {
  return permissionService.hasPermission(userId, serverId, permission);
}

export default async function permissionRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', requireAuth);

  /**
   * GET /api/v1/channels/:channelId/permissions
   * Get all permission overwrites for a channel
   */
  app.get(
    '/channels/:channelId/permissions',
    {
      schema: {
        description: 'Get all permission overwrites for a channel',
        tags: ['Permissions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['channelId'],
          properties: {
            channelId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { channelId: string } }>, reply: FastifyReply) => {
      const { channelId } = request.params;
      const userId = request.user!.id;

      const channel = await channelService.getChannel(channelId);
      if (!channel) {
        return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
      }

      // Check if member
      const isMember = await serverService.isMember(channel.server_id, userId);
      if (!isMember) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
      }

      const overwrites = await permissionService.getChannelOverwrites(channelId);
      return reply.send(successResponse(overwrites));
    }
  );

  /**
   * PUT /api/v1/channels/:channelId/permissions/:targetId
   * Create or update a permission overwrite
   */
  app.put(
    '/channels/:channelId/permissions/:targetId',
    {
      schema: {
        description: 'Create or update a permission overwrite',
        tags: ['Permissions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['channelId', 'targetId'],
          properties: {
            channelId: { type: 'string', minLength: 15, maxLength: 25 },
            targetId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          properties: {
            allow: { type: 'string', description: 'Bitwise permission string' },
            deny: { type: 'string', description: 'Bitwise permission string' },
            type: { type: 'string', enum: ['role', 'member'] },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
      preHandler: validateBody(overwriteSchema),
    },
    async (request: FastifyRequest<{
      Params: { channelId: string; targetId: string };
      Body: z.infer<typeof overwriteSchema> & { type?: 'role' | 'member' };
    }>, reply: FastifyReply) => {
      const { channelId, targetId } = request.params;
      const userId = request.user!.id;
      const body = request.body;

      const channel = await channelService.getChannel(channelId);
      if (!channel) {
        return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
      }

      // Check MANAGE_ROLES permission
      const hasPerms = await checkServerPermission(channel.server_id, userId, PERMISSION_FLAGS.MANAGE_ROLES);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage permissions' } });
      }

      // Determine target type
      let targetType: PermissionOverwriteType;

      if (body.type) {
        targetType = body.type;
      } else {
        // Auto-detect: if targetId matches serverId, it's @everyone role
        if (targetId === channel.server_id) {
          targetType = 'role';
        } else {
          // Check if it's a role or member
          const role = await roleService.getRole(targetId);
          if (role && role.server_id === channel.server_id) {
            targetType = 'role';
          } else {
            targetType = 'member';
          }
        }
      }

      // Validate target exists
      if (targetType === 'role') {
        const role = await roleService.getRole(targetId);
        if (!role || role.server_id !== channel.server_id) {
          return reply.code(400).send({ success: false, error: { code: 'INVALID_TARGET', message: 'Role not found in this server' } });
        }
      } else {
        const isMember = await serverService.isMember(channel.server_id, targetId);
        if (!isMember) {
          return reply.code(400).send({ success: false, error: { code: 'INVALID_TARGET', message: 'User is not a member of this server' } });
        }
      }

      const overwrite = await permissionService.setOverwrite({
        channelId,
        targetId,
        targetType,
        allow: body.allow ? BigInt(body.allow) : undefined,
        deny: body.deny ? BigInt(body.deny) : undefined,
      });

      return reply.send(successResponse(overwrite));
    }
  );

  /**
   * DELETE /api/v1/channels/:channelId/permissions/:targetId
   * Delete a permission overwrite
   */
  app.delete(
    '/channels/:channelId/permissions/:targetId',
    {
      schema: {
        description: 'Delete a permission overwrite',
        tags: ['Permissions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['channelId', 'targetId'],
          properties: {
            channelId: { type: 'string', minLength: 15, maxLength: 25 },
            targetId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { channelId: string; targetId: string } }>, reply: FastifyReply) => {
      const { channelId, targetId } = request.params;
      const userId = request.user!.id;

      const channel = await channelService.getChannel(channelId);
      if (!channel) {
        return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
      }

      // Check MANAGE_ROLES permission
      const hasPerms = await checkServerPermission(channel.server_id, userId, PERMISSION_FLAGS.MANAGE_ROLES);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage permissions' } });
      }

      await permissionService.deleteOverwrite(channelId, targetId);
      return reply.code(204).send();
    }
  );

  /**
   * GET /api/v1/channels/:channelId/permissions/@me
   * Get current user's permissions in a channel
   */
  app.get(
    '/channels/:channelId/permissions/@me',
    {
      schema: {
        description: "Get current user's permissions in a channel",
        tags: ['Permissions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['channelId'],
          properties: {
            channelId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { channelId: string } }>, reply: FastifyReply) => {
      const { channelId } = request.params;
      const userId = request.user!.id;

      const channel = await channelService.getChannel(channelId);
      if (!channel) {
        return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
      }

      // Check if member
      const isMember = await serverService.isMember(channel.server_id, userId);
      if (!isMember) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
      }

      const breakdown = await permissionService.getChannelPermissionBreakdown(
        userId,
        channelId
      );

      return reply.send(successResponse(breakdown));
    }
  );

  /**
   * POST /api/v1/channels/:channelId/permissions/check
   * Check if user has specific permissions
   */
  app.post(
    '/channels/:channelId/permissions/check',
    {
      schema: {
        description: 'Check if user has specific permissions',
        tags: ['Permissions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['channelId'],
          properties: {
            channelId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          required: ['permissions'],
          properties: {
            permissions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of permission names to check',
            },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
      preHandler: validateBody(permissionCheckSchema),
    },
    async (request: FastifyRequest<{
      Params: { channelId: string };
      Body: z.infer<typeof permissionCheckSchema>;
    }>, reply: FastifyReply) => {
      const { channelId } = request.params;
      const userId = request.user!.id;
      const { permissions: permissionNames } = request.body;

      const channel = await channelService.getChannel(channelId);
      if (!channel) {
        return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
      }

      // Check if member
      const isMember = await serverService.isMember(channel.server_id, userId);
      if (!isMember) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
      }

      // Calculate effective permissions
      const effectivePerms = await permissionService.calculateEffectivePermissions(
        userId,
        channel.server_id
      );

      // Check each permission
      const results: Record<string, boolean> = {};
      for (const name of permissionNames) {
        const flag = PERMISSION_FLAGS[name as keyof typeof PERMISSION_FLAGS];
        if (flag) {
          // Use channel-specific permission check
          const hasPerm = await permissionService.hasChannelPermission(userId, channelId, flag);
          results[name] = hasPerm;
        } else {
          results[name] = false;
        }
      }

      // Return effective permissions and results
      const combinedPermissions = effectivePerms.allow & ~effectivePerms.deny;

      return reply.send(successResponse({
        permissions: combinedPermissions.toString(),
        results,
      }));
    }
  );
}
