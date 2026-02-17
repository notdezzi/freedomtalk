/**
 * Channel Routes
 * Handles channel and category management endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { successResponse } from '../../utils/errors';
import { channelService } from '../../services/channel/channel.service';
import { categoryService } from '../../services/channel/category.service';
import { serverService } from '../../services/server/server.service';
import { roleService } from '../../services/server/role.service';
import { VALIDATION, PERMISSION_FLAGS, Permissions } from '@freedomtalk/shared';

// Validation schemas
const createChannelSchema = z.object({
  name: z.string().min(VALIDATION.CHANNEL_NAME.MIN_LENGTH).max(VALIDATION.CHANNEL_NAME.MAX_LENGTH),
  type: z.enum(['text', 'voice', 'announcement']),
  categoryId: z.string().length(20).optional(),
  topic: z.string().max(VALIDATION.CHANNEL_TOPIC.MAX_LENGTH).optional(),
  position: z.number().int().min(0).optional(),
  nsfw: z.boolean().optional(),
  rateLimitPerUser: z.number().int().min(0).max(21600).optional(),
  bitrate: z.number().int().min(VALIDATION.VOICE.MIN_BITRATE).max(VALIDATION.VOICE.MAX_BITRATE).optional(),
  userLimit: z.number().int().min(0).max(VALIDATION.VOICE.MAX_USER_LIMIT).optional(),
  rtcRegion: z.string().max(20).optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(VALIDATION.CATEGORY_NAME.MIN_LENGTH).max(VALIDATION.CATEGORY_NAME.MAX_LENGTH),
  position: z.number().int().min(0).optional(),
  nsfw: z.boolean().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(VALIDATION.CATEGORY_NAME.MIN_LENGTH).max(VALIDATION.CATEGORY_NAME.MAX_LENGTH).optional(),
  position: z.number().int().min(0).optional(),
  nsfw: z.boolean().optional(),
});

const channelPositionsSchema = z.object({
  positions: z.array(z.object({
    id: z.string().length(20),
    position: z.number().int().min(0),
    categoryId: z.string().length(20).nullable().optional(),
  })),
});

// Permission check helper
async function checkServerPermission(
  serverId: string,
  userId: string,
  permission: bigint
): Promise<boolean> {
  const isOwner = await serverService.isOwner(serverId, userId);
  if (isOwner) return true;

  const permissions = await roleService.calculateMemberPermissions(serverId, userId);
  return Permissions.has(permissions, permission);
}

export default async function channelRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', requireAuth);

  // ============================================
  // Channels
  // ============================================

  /**
   * GET /api/v1/servers/:serverId/channels
   * Get all channels for a server
   */
  app.get(
    '/servers/:serverId/channels',
    {
      schema: {
        description: 'Get all channels for a server',
        tags: ['Channels'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        // Remove response schema to avoid Fastify stripping properties
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string } }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;

      // Check if member
      const isMember = await serverService.isMember(serverId, userId);
      if (!isMember) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
      }

      const channels = await channelService.getServerChannels(serverId);
      return reply.send(successResponse(channels));
    }
  );

  /**
   * POST /api/v1/servers/:serverId/channels
   * Create a new channel
   */
  app.post(
    '/servers/:serverId/channels',
    {
      schema: {
        description: 'Create a new channel',
        tags: ['Channels'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: { type: 'string', minLength: VALIDATION.CHANNEL_NAME.MIN_LENGTH, maxLength: VALIDATION.CHANNEL_NAME.MAX_LENGTH },
            type: { type: 'string', enum: ['text', 'voice', 'announcement'] },
            categoryId: { type: 'string', minLength: 15, maxLength: 25 },
            topic: { type: 'string', maxLength: VALIDATION.CHANNEL_TOPIC.MAX_LENGTH },
            position: { type: 'integer', minimum: 0 },
            nsfw: { type: 'boolean' },
            rateLimitPerUser: { type: 'integer', minimum: 0, maximum: 21600 },
            bitrate: { type: 'integer', minimum: VALIDATION.VOICE.MIN_BITRATE, maximum: VALIDATION.VOICE.MAX_BITRATE },
            userLimit: { type: 'integer', minimum: 0, maximum: VALIDATION.VOICE.MAX_USER_LIMIT },
            rtcRegion: { type: 'string', maxLength: 20 },
          },
        },
        response: {
          201: { type: 'object' },
        },
      },
      preHandler: validateBody(createChannelSchema),
    },
    async (request: FastifyRequest<{ Params: { serverId: string }; Body: z.infer<typeof createChannelSchema> }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;
      const body = request.body;

      // Check MANAGE_CHANNELS permission
      const hasPerms = await checkServerPermission(serverId, userId, PERMISSION_FLAGS.MANAGE_CHANNELS);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage channels' } });
      }

      const channel = await channelService.createChannel({
        serverId,
        ...body,
      });

      return reply.code(201).send(successResponse(channel));
    }
  );

  /**
   * PATCH /api/v1/servers/:serverId/channels/positions
   * Update channel positions
   */
  app.patch(
    '/servers/:serverId/channels/positions',
    {
      schema: {
        description: 'Update channel positions',
        tags: ['Channels'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          required: ['positions'],
          properties: {
            positions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'position'],
                properties: {
                  id: { type: 'string', minLength: 15, maxLength: 25 },
                  position: { type: 'integer', minimum: 0 },
                  categoryId: { type: 'string', minLength: 15, maxLength: 25, nullable: true },
                },
              },
            },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
      preHandler: validateBody(channelPositionsSchema),
    },
    async (request: FastifyRequest<{ Params: { serverId: string }; Body: z.infer<typeof channelPositionsSchema> }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;
      const { positions } = request.body;

      // Check MANAGE_CHANNELS permission
      const hasPerms = await checkServerPermission(serverId, userId, PERMISSION_FLAGS.MANAGE_CHANNELS);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage channels' } });
      }

      const channels = await channelService.updateChannelPositions(serverId, positions);
      return reply.send(successResponse(channels));
    }
  );

  // ============================================
  // Categories
  // ============================================

  /**
   * GET /api/v1/servers/:serverId/categories
   * Get all categories for a server
   */
  app.get(
    '/servers/:serverId/categories',
    {
      schema: {
        description: 'Get all categories for a server',
        tags: ['Categories'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string } }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;

      // Check if member
      const isMember = await serverService.isMember(serverId, userId);
      if (!isMember) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
      }

      const categories = await categoryService.getServerCategories(serverId);
      return reply.send(successResponse(categories));
    }
  );

  /**
   * POST /api/v1/servers/:serverId/categories
   * Create a new category
   */
  app.post(
    '/servers/:serverId/categories',
    {
      schema: {
        description: 'Create a new category',
        tags: ['Categories'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: VALIDATION.CATEGORY_NAME.MIN_LENGTH, maxLength: VALIDATION.CATEGORY_NAME.MAX_LENGTH },
            position: { type: 'integer', minimum: 0 },
            nsfw: { type: 'boolean' },
          },
        },
        response: {
          201: { type: 'object' },
        },
      },
      preHandler: validateBody(createCategorySchema),
    },
    async (request: FastifyRequest<{ Params: { serverId: string }; Body: z.infer<typeof createCategorySchema> }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;

      // Check MANAGE_CHANNELS permission
      const hasPerms = await checkServerPermission(serverId, userId, PERMISSION_FLAGS.MANAGE_CHANNELS);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage channels' } });
      }

      const category = await categoryService.createCategory({
        serverId,
        ...request.body,
      });

      return reply.code(201).send(successResponse(category));
    }
  );

  /**
   * PATCH /api/v1/categories/:categoryId
   * Update a category
   */
  app.patch(
    '/categories/:categoryId',
    {
      schema: {
        description: 'Update category settings',
        tags: ['Categories'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['categoryId'],
          properties: {
            categoryId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: VALIDATION.CATEGORY_NAME.MIN_LENGTH, maxLength: VALIDATION.CATEGORY_NAME.MAX_LENGTH },
            position: { type: 'integer', minimum: 0 },
            nsfw: { type: 'boolean' },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
      preHandler: validateBody(updateCategorySchema),
    },
    async (request: FastifyRequest<{ Params: { categoryId: string }; Body: z.infer<typeof updateCategorySchema> }>, reply: FastifyReply) => {
      const { categoryId } = request.params;
      const userId = request.user!.id;

      const category = await categoryService.getCategory(categoryId);
      if (!category) {
        return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
      }

      // Check MANAGE_CHANNELS permission
      const hasPerms = await checkServerPermission(category.server_id, userId, PERMISSION_FLAGS.MANAGE_CHANNELS);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage channels' } });
      }

      const updated = await categoryService.updateCategory(categoryId, request.body);
      return reply.send(successResponse(updated));
    }
  );

  /**
   * DELETE /api/v1/categories/:categoryId
   * Delete a category
   */
  app.delete(
    '/categories/:categoryId',
    {
      schema: {
        description: 'Delete a category (channels are moved to no category)',
        tags: ['Categories'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['categoryId'],
          properties: {
            categoryId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { categoryId: string } }>, reply: FastifyReply) => {
      const { categoryId } = request.params;
      const userId = request.user!.id;

      const category = await categoryService.getCategory(categoryId);
      if (!category) {
        return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
      }

      // Check MANAGE_CHANNELS permission
      const hasPerms = await checkServerPermission(category.server_id, userId, PERMISSION_FLAGS.MANAGE_CHANNELS);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage channels' } });
      }

      await categoryService.deleteCategory(categoryId);
      return reply.code(204).send();
    }
  );
}
