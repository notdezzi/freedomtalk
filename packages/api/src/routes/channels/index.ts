/**
 * Channel Routes
 * Handles channel and category management endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { requireServerPermission } from '../../middleware/permission.middleware';
import { successResponse } from '../../utils/errors';
import { channelService } from '../../services/channel/channel.service';
import { categoryService } from '../../services/channel/category.service';
import { serverService } from '../../services/server/server.service';
import { permissionService } from '../../services/permission';
import { VALIDATION, PERMISSION_FLAGS } from '@freedomtalk/shared';

// Validation schemas
const createChannelSchema = z.object({
  name: z.string().min(VALIDATION.CHANNEL_NAME.MIN_LENGTH).max(VALIDATION.CHANNEL_NAME.MAX_LENGTH),
  type: z.enum(['text', 'voice', 'announcement']),
  categoryId: z.string().min(18).max(20).optional(),
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
    id: z.string().min(18).max(20),
    position: z.number().int().min(0),
    categoryId: z.string().min(18).max(20).nullable().optional(),
  })),
});

const categoryPositionsSchema = z.object({
  positions: z.array(z.object({
    id: z.string().min(18).max(20),
    position: z.number().int().min(0),
  })),
});

export default async function channelRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', requireAuth);

  // ============================================
  // Channels
  // ============================================

  /**
   * GET /api/v1/servers/:serverId/channels
   * Get all channels and categories for a server
   */
  app.get(
    '/servers/:serverId/channels',
    {
      schema: {
        description: 'Get all channels and categories for a server',
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

      const [channels, categories] = await Promise.all([
        channelService.getServerChannels(serverId),
        categoryService.getServerCategories(serverId),
      ]);

      return reply.send(successResponse({ channels, categories }));
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
      onRequest: [requireServerPermission(PERMISSION_FLAGS.MANAGE_CHANNELS)],
      preHandler: validateBody(createChannelSchema),
    },
    async (request, reply) => {
      const { serverId } = request.params as { serverId: string };
      const body = request.body as z.infer<typeof createChannelSchema>;

      const channel = await channelService.createChannel({
        serverId,
        ...body,
      });

      return reply.code(201).send(successResponse(channel));
    }
  );

  /**
   * PATCH /api/v1/servers/:serverId/channels/:channelId
   * Update a channel
   */
  app.patch(
    '/servers/:serverId/channels/:channelId',
    {
      schema: {
        description: 'Update a channel',
        tags: ['Channels'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId', 'channelId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
            channelId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: VALIDATION.CHANNEL_NAME.MIN_LENGTH, maxLength: VALIDATION.CHANNEL_NAME.MAX_LENGTH },
            topic: { type: 'string', maxLength: VALIDATION.CHANNEL_TOPIC.MAX_LENGTH },
            position: { type: 'integer', minimum: 0 },
            nsfw: { type: 'boolean' },
            rateLimitPerUser: { type: 'integer', minimum: 0, maximum: 21600 },
            bitrate: { type: 'integer', minimum: VALIDATION.VOICE.MIN_BITRATE, maximum: VALIDATION.VOICE.MAX_BITRATE },
            userLimit: { type: 'integer', minimum: 0, maximum: VALIDATION.VOICE.MAX_USER_LIMIT },
            rtcRegion: { type: 'string', maxLength: 20 },
          },
        },
      },
      onRequest: [requireServerPermission(PERMISSION_FLAGS.MANAGE_CHANNELS)],
    },
    async (request, reply) => {
      const { serverId, channelId } = request.params as { serverId: string; channelId: string };
      const updates = request.body as Partial<{
        name: string;
        topic: string;
        position: number;
        nsfw: boolean;
        rateLimitPerUser: number;
        bitrate: number;
        userLimit: number;
        rtcRegion: string;
      }>;

      // Verify channel belongs to this server
      const channel = await channelService.getChannel(channelId);
      if (!channel || channel.server_id !== serverId) {
        return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
      }

      const updatedChannel = await channelService.updateChannel(channelId, updates);

      return reply.send(successResponse(updatedChannel));
    }
  );

  /**
   * DELETE /api/v1/servers/:serverId/channels/:channelId
   * Delete a channel
   */
  app.delete(
    '/servers/:serverId/channels/:channelId',
    {
      schema: {
        description: 'Delete a channel',
        tags: ['Channels'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId', 'channelId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
            channelId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
      },
      onRequest: [requireServerPermission(PERMISSION_FLAGS.MANAGE_CHANNELS)],
    },
    async (request, reply) => {
      const { serverId, channelId } = request.params as { serverId: string; channelId: string };

      // Verify channel belongs to this server
      const channel = await channelService.getChannel(channelId);
      if (!channel || channel.server_id !== serverId) {
        return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
      }

      await channelService.deleteChannel(channelId);

      return reply.send(successResponse({ message: 'Channel deleted' }));
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
        // Remove response schema to avoid Fastify stripping properties
      },
      onRequest: [requireServerPermission(PERMISSION_FLAGS.MANAGE_CHANNELS)],
      preHandler: validateBody(channelPositionsSchema),
    },
    async (request, reply) => {
      const { serverId } = request.params as { serverId: string };
      const { positions } = request.body as z.infer<typeof channelPositionsSchema>;

      const channels = await channelService.updateChannelPositions(serverId, positions);
      return reply.send(successResponse(channels));
    }
  );

  /**
   * PATCH /api/v1/servers/:serverId/categories/positions
   * Update category positions
   */
  app.patch(
    '/servers/:serverId/categories/positions',
    {
      schema: {
        description: 'Update category positions',
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
                },
              },
            },
          },
        },
      },
      onRequest: [requireServerPermission(PERMISSION_FLAGS.MANAGE_CHANNELS)],
      preHandler: validateBody(categoryPositionsSchema),
    },
    async (request, reply) => {
      const { serverId } = request.params as { serverId: string };
      const { positions } = request.body as z.infer<typeof categoryPositionsSchema>;

      const categories = await categoryService.updateCategoryPositions(serverId, positions);
      return reply.send(successResponse(categories));
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
      onRequest: [requireServerPermission(PERMISSION_FLAGS.MANAGE_CHANNELS)],
      preHandler: validateBody(createCategorySchema),
    },
    async (request, reply) => {
      const { serverId } = request.params as { serverId: string };
      const body = request.body as z.infer<typeof createCategorySchema>;

      const category = await categoryService.createCategory({
        serverId,
        ...body,
      });

      return reply.code(201).send(successResponse(category));
    }
  );

  /**
   * PATCH /api/v1/categories/:categoryId
   * Update a category
   * Note: Uses inline permission check because serverId is not in params
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

      // Check MANAGE_CHANNELS permission using permissionService
      const hasPerms = await permissionService.hasPermission(userId, category.server_id, PERMISSION_FLAGS.MANAGE_CHANNELS);
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
   * Note: Uses inline permission check because serverId is not in params
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

      // Check MANAGE_CHANNELS permission using permissionService
      const hasPerms = await permissionService.hasPermission(userId, category.server_id, PERMISSION_FLAGS.MANAGE_CHANNELS);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage channels' } });
      }

      await categoryService.deleteCategory(categoryId);
      return reply.code(204).send();
    }
  );
}
