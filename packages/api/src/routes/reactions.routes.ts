/**
 * Reaction Routes
 * Handles message reaction operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { validateParams, validateQuery } from '../middleware/validation.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { successResponse } from '../utils/errors';
import { reactionService } from '../services/reaction/reaction.service';
import { messageService } from '../services/message/message.service';
import { channelService } from '../services/channel/channel.service';
import { roleService } from '../services/server/role.service';
import { PERMISSION_FLAGS, Permissions } from '@freedomtalk/shared';
import { ApiError, ApiErrorCode } from '../types/api.types';
import { logger } from '../config/logger';

// Zod schemas for validation
const messageIdParamSchema = z.object({
  messageId: z.string().min(15).max(25, 'Invalid message ID'),
});

const emojiParamSchema = z.object({
  messageId: z.string().min(15).max(25, 'Invalid message ID'),
  emoji: z.string().min(1).max(100, 'Invalid emoji'),
});

const paginationQuerySchema = z.object({
  limit: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().min(1).max(100).optional()
  ),
  offset: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().min(0).optional()
  ),
});

/**
 * Parse emoji parameter into type and ID/unicode
 * Format: "unicode:😀" or "custom:123456789012345678"
 */
function parseEmoji(emoji: string): { type: 'unicode' | 'custom'; id?: string; unicode?: string } {
  const parts = emoji.split(':');
  if (parts.length !== 2) {
    throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Invalid emoji format. Use "unicode:😀" or "custom:emojiId"', 400);
  }

  const [type, value] = parts;
  if (type !== 'unicode' && type !== 'custom') {
    throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Emoji type must be "unicode" or "custom"', 400);
  }

  if (type === 'custom') {
    if (!value || value.length !== 20) {
      throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Custom emoji ID must be 20 characters', 400);
    }
    return { type: 'custom', id: value };
  } else {
    if (!value) {
      throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Unicode emoji value is required', 400);
    }
    return { type: 'unicode', unicode: value };
  }
}

/**
 * Check if user can manage reactions on a message
 * User can manage reactions if:
 * 1. They are the author of the message, OR
 * 2. They have MANAGE_MESSAGES permission in the server
 */
async function canManageReactions(messageId: string, userId: string): Promise<boolean> {
  try {
    // Get message to check author
    const message = await messageService.getMessage(messageId);
    if (!message) {
      return false;
    }

    // If user is the message author, they can manage reactions
    if (message.author_id === userId) {
      return true;
    }

    // If message is in a server channel, check MANAGE_MESSAGES permission
    if (message.channel_id) {
      const channel = await channelService.getChannel(message.channel_id);
      if (channel && channel.server_id) {
        const permissions = await roleService.calculateMemberPermissions(channel.server_id, userId);
        if (Permissions.has(permissions, PERMISSION_FLAGS.MANAGE_MESSAGES)) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    logger.error({ error, messageId, userId }, 'Error checking reaction permissions');
    return false;
  }
}

export default async function reactionRoutes(app: FastifyInstance) {
  // All reaction routes require authentication
  app.addHook('onRequest', requireAuth);

  /**
   * PUT /api/v1/messages/:messageId/reactions/:emoji
   * Add a reaction to a message
   */
  app.put(
    '/:messageId/reactions/:emoji',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '10 seconds',
        },
      },
      schema: {
        description: 'Add a reaction to a message',
        tags: ['Reactions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['messageId', 'emoji'],
          properties: {
            messageId: { type: 'string', minLength: 15, maxLength: 25 },
            emoji: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
        response: {
          200: {
            description: 'Reaction added successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  message_id: { type: 'string' },
                  user_id: { type: 'string' },
                  emoji_type: { type: 'string', enum: ['unicode', 'custom'] },
                  emoji_id: { type: 'string', nullable: true },
                  emoji_unicode: { type: 'string', nullable: true },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          400: { description: 'Invalid emoji format or validation error' },
          401: { description: 'Unauthorized' },
          404: { description: 'Message not found' },
          409: { description: 'Reaction already exists or limit exceeded' },
          429: { description: 'Rate limit exceeded' },
        },
      },
      preHandler: [validateParams(emojiParamSchema)],
    },
    async (request: FastifyRequest<{ Params: { messageId: string; emoji: string } }>, reply: FastifyReply) => {
      const { messageId, emoji } = request.params;
      const userId = request.user!.id;

      const parsed = parseEmoji(emoji);
      const reaction = await reactionService.addReaction(
        messageId,
        userId,
        parsed.type,
        parsed.id,
        parsed.unicode
      );

      logger.info({ messageId, userId, emoji }, 'Reaction added via API');

      reply.send(successResponse(reaction));
    }
  );

  /**
   * DELETE /api/v1/messages/:messageId/reactions/:emoji/@me
   * Remove own reaction from a message
   */
  app.delete(
    '/:messageId/reactions/:emoji/@me',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '10 seconds',
        },
      },
      schema: {
        description: 'Remove own reaction from a message',
        tags: ['Reactions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['messageId', 'emoji'],
          properties: {
            messageId: { type: 'string', minLength: 15, maxLength: 25 },
            emoji: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
      preHandler: [validateParams(emojiParamSchema)],
    },
    async (request: FastifyRequest<{ Params: { messageId: string; emoji: string } }>, reply: FastifyReply) => {
      const { messageId, emoji } = request.params;
      const userId = request.user!.id;

      const parsed = parseEmoji(emoji);
      await reactionService.removeReaction(
        messageId,
        userId,
        parsed.type,
        parsed.id,
        parsed.unicode
      );

      logger.info({ messageId, userId, emoji }, 'Reaction removed via API');

      reply.status(204).send();
    }
  );

  /**
   * DELETE /api/v1/messages/:messageId/reactions/:emoji
   * Remove all reactions of a specific emoji from a message (requires permission)
   */
  app.delete(
    '/:messageId/reactions/:emoji',
    {
      schema: {
        description: 'Remove all reactions of a specific emoji (requires permission)',
        tags: ['Reactions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['messageId', 'emoji'],
          properties: {
            messageId: { type: 'string', minLength: 15, maxLength: 25 },
            emoji: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
        response: {
          200: {
            description: 'Reactions removed successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  count: { type: 'number' },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - requires message author or admin permission' },
          404: { description: 'Message not found' },
        },
      },
      preHandler: [validateParams(emojiParamSchema)],
    },
    async (request: FastifyRequest<{ Params: { messageId: string; emoji: string } }>, reply: FastifyReply) => {
      const { messageId, emoji } = request.params;
      const userId = request.user!.id;

      // Check permission: message author or MANAGE_MESSAGES permission required
      const canManage = await canManageReactions(messageId, userId);
      if (!canManage) {
        return reply.code(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only remove reactions from your own messages or if you have MANAGE_MESSAGES permission',
          },
        });
      }

      const parsed = parseEmoji(emoji);
      const count = await reactionService.removeReactionsByEmoji(
        messageId,
        parsed.type,
        parsed.id,
        parsed.unicode
      );

      logger.info({ messageId, userId, emoji, count }, 'Reactions removed by emoji via API');

      reply.send(successResponse({ count }));
    }
  );

  /**
   * DELETE /api/v1/messages/:messageId/reactions
   * Remove all reactions from a message (requires permission)
   */
  app.delete(
    '/:messageId/reactions',
    {
      schema: {
        description: 'Remove all reactions from a message (requires permission)',
        tags: ['Reactions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['messageId'],
          properties: {
            messageId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: {
            description: 'All reactions removed successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  count: { type: 'number' },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - requires message author or admin permission' },
          404: { description: 'Message not found' },
        },
      },
      preHandler: [validateParams(messageIdParamSchema)],
    },
    async (request: FastifyRequest<{ Params: { messageId: string } }>, reply: FastifyReply) => {
      const { messageId } = request.params;
      const userId = request.user!.id;

      // Check permission: message author or MANAGE_MESSAGES permission required
      const canManage = await canManageReactions(messageId, userId);
      if (!canManage) {
        return reply.code(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only remove reactions from your own messages or if you have MANAGE_MESSAGES permission',
          },
        });
      }

      const count = await reactionService.removeAllReactions(messageId);

      logger.info({ messageId, userId, count }, 'All reactions removed via API');

      reply.send(successResponse({ count }));
    }
  );

  /**
   * GET /api/v1/messages/:messageId/reactions/:emoji
   * Get users who reacted with a specific emoji (paginated)
   */
  app.get(
    '/:messageId/reactions/:emoji',
    {
      schema: {
        description: 'Get users who reacted with a specific emoji',
        tags: ['Reactions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['messageId', 'emoji'],
          properties: {
            messageId: { type: 'string', minLength: 15, maxLength: 25 },
            emoji: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'string', pattern: '^\\d+$' },
            offset: { type: 'string', pattern: '^\\d+$' },
          },
        },
        response: {
          200: {
            description: 'Users retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  users: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                },
              },
            },
          },
          400: { description: 'Invalid emoji format or pagination parameters' },
          401: { description: 'Unauthorized' },
          404: { description: 'Message not found' },
        },
      },
      preHandler: [validateParams(emojiParamSchema), validateQuery(paginationQuerySchema)],
    },
    async (request: FastifyRequest<{
      Params: { messageId: string; emoji: string };
      Querystring: { limit?: number; offset?: number };
    }>, reply: FastifyReply) => {
      const { messageId, emoji } = request.params;
      const { limit = 100, offset = 0 } = request.query;

      const parsed = parseEmoji(emoji);
      const users = await reactionService.getReactionUsers(
        messageId,
        parsed.type,
        parsed.id,
        parsed.unicode,
        limit,
        offset
      );

      reply.send(successResponse({ users, limit, offset }));
    }
  );

  /**
   * GET /api/v1/messages/:messageId/reactions
   * Get all reactions for a message, grouped by emoji
   */
  app.get(
    '/:messageId/reactions',
    {
      schema: {
        description: 'Get all reactions for a message',
        tags: ['Reactions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['messageId'],
          properties: {
            messageId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: {
            description: 'Reactions retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    emoji_type: { type: 'string', enum: ['unicode', 'custom'] },
                    emoji_id: { type: 'string', nullable: true },
                    emoji_unicode: { type: 'string', nullable: true },
                    count: { type: 'number' },
                    users: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    me: { type: 'boolean' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          404: { description: 'Message not found' },
        },
      },
      preHandler: [validateParams(messageIdParamSchema)],
    },
    async (request: FastifyRequest<{ Params: { messageId: string } }>, reply: FastifyReply) => {
      const { messageId } = request.params;
      const userId = request.user!.id;

      const reactions = await reactionService.getReactionsByMessage(messageId);

      // Set 'me' flag for each reaction based on current user
      const reactionsWithMe = reactions.map(reaction => ({
        ...reaction,
        me: reaction.users.includes(userId),
      }));

      reply.send(successResponse(reactionsWithMe));
    }
  );
}

