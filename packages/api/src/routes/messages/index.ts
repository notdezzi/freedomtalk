/**
 * Message Routes
 * Handles message CRUD operations, pagination, and history
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { validateBody } from '../../middleware/validation.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { successResponse } from '../../utils/errors';
import { messageService } from '../../services/message/message.service';
import { messageRouter } from '../../services/websocket/message.router';
import { permissionService } from '../../services/permission';
import { dmChannelService } from '../../services/dm/dm-channel.service';
import { VALIDATION, PERMISSION_FLAGS } from '@freedomtalk/shared';

/**
 * Message create with embeds schema
 * Content can be empty if attachments are present
 */
const createMessageWithEmbedsSchema = z.object({
  content: z.string().max(2000).default(''), // Allow empty string for attachment-only messages
  channelId: z.string().min(15).max(25).optional(),
  dmChannelId: z.string().min(15).max(25).optional(),
  embeds: z.array(z.any()).max(VALIDATION.EMBED.MAX_PER_MESSAGE).optional(),
  attachments: z.array(z.any()).max(VALIDATION.ATTACHMENT.MAX_PER_MESSAGE).optional(),
}).refine(
  (data) => data.content.length > 0 || (data.attachments && data.attachments.length > 0),
  { message: 'Message must have content or attachments' }
);

interface GetMessagesQuerystring {
  before?: string;
  after?: string;
  limit?: string;
  authorId?: string;
  channelId?: string;
  isPinned?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export default async function messageRoutes(app: FastifyInstance) {
  // All message routes require authentication
  app.addHook('onRequest', requireAuth);

  /**
   * POST /api/v1/messages
   * Create a new message
   * Requires SEND_MESSAGES permission for channel messages
   */
  app.post(
    '/',
    {
      schema: {
        description: 'Create a new message with optional embeds',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        // Body validation handled by Zod in preHandler
        response: {
          201: {
            description: 'Message created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  content: { type: 'string' },
                  author_id: { type: 'string' },
                  channel_id: { type: 'string', nullable: true },
                  is_edited: { type: 'boolean' },
                  edited_at: { type: 'string', nullable: true },
                  is_deleted: { type: 'boolean' },
                  deleted_at: { type: 'string', nullable: true },
                  is_pinned: { type: 'boolean' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' },
                  embeds: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
      preHandler: [validateBody(createMessageWithEmbedsSchema)],
    },
    async (request: FastifyRequest<{ Body: { content: string; channelId?: string; dmChannelId?: string; embeds?: any[]; attachments?: any[] } }>, reply: FastifyReply) => {
      const { content, channelId, dmChannelId, embeds, attachments } = request.body;
      const userId = request.user!.id;
      const username = request.user!.username;

      // Check SEND_MESSAGES permission for channel messages
      if (channelId) {
        const hasPermission = await permissionService.hasChannelPermission(userId, channelId, PERMISSION_FLAGS.SEND_MESSAGES);
        if (!hasPermission) {
          return reply.code(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You do not have permission to send messages in this channel' }
          });
        }
      }

      // Check DM channel participation for DM messages
      if (dmChannelId) {
        const isParticipant = await dmChannelService.isParticipant(dmChannelId, userId);
        if (!isParticipant) {
          return reply.code(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You are not a participant of this DM channel' }
          });
        }
      }

      const message = await messageService.createMessage({
        content,
        authorId: userId,
        channelId,
        dmChannelId,
        embeds,
        attachments,
      });

      // Broadcast message via WebSocket
      const wsMessage = {
        id: message.id,
        content: message.content,
        authorId: message.author_id,
        channelId: message.channel_id,
        dmChannelId: message.dm_channel_id,
        createdAt: message.created_at.toISOString(),
        updatedAt: message.updated_at.toISOString(),
        isEdited: message.is_edited,
        isDeleted: message.is_deleted,
        author: {
          id: userId,
          username: username,
        },
        embeds: message.embeds?.map(embed => ({
          ...embed,
          timestamp: embed.timestamp instanceof Date ? embed.timestamp.toISOString() : embed.timestamp,
        })),
      };

      // Route message to appropriate recipients
      try {
        await messageRouter.routeMessage(wsMessage);
      } catch (broadcastError) {
        // Log but don't fail the request if broadcast fails
        request.log.error({ error: broadcastError, messageId: message.id }, 'Failed to broadcast message');
      }

      return reply.code(201).send(successResponse(message));
    }
  );

  /**
   * GET /api/v1/messages/:id
   * Get a single message by ID
   */
  app.get(
    '/:id',
    {
      schema: {
        description: 'Get a message by ID',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: {
            description: 'Message retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const message = await messageService.getMessage(id);

      return reply.send(successResponse(message));
    }
  );

  /**
   * GET /api/v1/messages
   * Get messages with pagination and filtering
   * Requires VIEW_CHANNEL and READ_MESSAGE_HISTORY permissions for channel messages
   */
  app.get(
    '/',
    {
      schema: {
        description: 'Get messages with pagination and filtering',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            before: { type: 'string' },
            after: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            authorId: { type: 'string' },
            channelId: { type: 'string' },
            isPinned: { type: 'boolean' },
            search: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        // Remove response schema to avoid Fastify stripping properties
      },
    },
    async (request: FastifyRequest<{ Querystring: GetMessagesQuerystring }>, reply: FastifyReply) => {
      const { before, after, limit, authorId, channelId, isPinned, search, startDate, endDate } = request.query;
      const userId = request.user!.id;

      // Check permissions for channel messages
      if (channelId) {
        const hasViewChannel = await permissionService.hasChannelPermission(userId, channelId, PERMISSION_FLAGS.VIEW_CHANNEL);
        if (!hasViewChannel) {
          return reply.code(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You do not have permission to view this channel' }
          });
        }
        const hasReadHistory = await permissionService.hasChannelPermission(userId, channelId, PERMISSION_FLAGS.READ_MESSAGE_HISTORY);
        if (!hasReadHistory) {
          return reply.code(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You do not have permission to read message history in this channel' }
          });
        }
      }

      const result = await messageService.getMessages(
        { before, after, limit: limit ? parseInt(limit, 10) : undefined },
        {
          authorId,
          channelId,
          isPinned: isPinned === 'true' ? true : isPinned === 'false' ? false : undefined,
          search,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        }
      );

      // Transform reactions to match frontend format and set 'me' flag
      const messagesWithReactions = result.messages.map((msg) => ({
        ...msg,
        reactions: msg.reactions?.map((reaction) => ({
          emoji: {
            id: reaction.emoji_id || undefined,
            name: reaction.emoji_unicode || reaction.emoji_id || '',
          },
          count: reaction.count,
          me: reaction.users.includes(userId),
        })),
      }));

      return reply.send(successResponse({
        ...result,
        messages: messagesWithReactions,
      }));
    }
  );

  /**
   * PATCH /api/v1/messages/:id
   * Update a message
   */
  app.patch(
    '/:id',
    {
      schema: {
        description: 'Update a message',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 2000 },
          },
        },
        response: {
          200: {
            description: 'Message updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { content: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { content } = request.body;
      const userId = request.user!.id;

      const message = await messageService.updateMessage(id, content, userId);

      return reply.send(successResponse(message));
    }
  );

  /**
   * DELETE /api/v1/messages/:id
   * Soft delete a message
   * Users can delete their own messages; deleting others requires MANAGE_MESSAGES
   */
  app.delete(
    '/:id',
    {
      schema: {
        description: 'Soft delete a message. Users can delete their own messages; deleting others requires MANAGE_MESSAGES permission.',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            hard: { type: 'boolean', description: 'Permanently delete the message' },
          },
        },
        response: {
          204: {
            description: 'Message deleted successfully',
            type: 'null',
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Querystring: { hard?: boolean } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { hard } = request.query;
      const userId = request.user!.id;

      // Get the message to check ownership
      const message = await messageService.getMessage(id, true);

      // Check if user is the message author
      const isOwner = message.author_id === userId;

      // If not the owner, check for MANAGE_MESSAGES permission
      if (!isOwner && message.channel_id) {
        // Get the channel to find the server_id
        const { channelService } = await import('../../services/channel/channel.service');
        const channel = await channelService.getChannel(message.channel_id);

        if (channel && channel.server_id) {
          const hasPerms = await permissionService.hasPermission(userId, channel.server_id, PERMISSION_FLAGS.MANAGE_MESSAGES);
          if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this message' } });
          }
        } else {
          // For DM channels, only the author can delete
          return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You can only delete your own messages' } });
        }
      } else if (!isOwner && !message.channel_id) {
        // DM message - only author can delete
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You can only delete your own messages' } });
      }

      if (hard) {
        await messageService.hardDeleteMessage(id);
      } else {
        await messageService.softDeleteMessage(id, userId);
      }

      return reply.code(204).send();
    }
  );

  /**
   * GET /api/v1/messages/:id/history
   * Get edit history for a message
   */
  app.get(
    '/:id/history',
    {
      schema: {
        description: 'Get message edit history',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: {
            description: 'Message history retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const history = await messageService.getMessageHistory(id);

      return reply.send(successResponse(history));
    }
  );

  /**
   * POST /api/v1/messages/:id/pin
   * Pin a message
   * Requires PIN_MESSAGES permission for server channels
   */
  app.post(
    '/:id/pin',
    {
      schema: {
        description: 'Pin a message',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: {
            description: 'Message pinned successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = request.user!.id;

      // Get message to check channel permission
      const message = await messageService.getMessage(id, true);
      if (message.channel_id) {
        const hasPermission = await permissionService.hasChannelPermission(userId, message.channel_id, PERMISSION_FLAGS.PIN_MESSAGES);
        if (!hasPermission) {
          return reply.code(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You do not have permission to pin messages in this channel' }
          });
        }
      }

      const pinnedMessage = await messageService.pinMessage(id);

      return reply.send(successResponse(pinnedMessage));
    }
  );

  /**
   * DELETE /api/v1/messages/:id/pin
   * Unpin a message
   * Requires PIN_MESSAGES permission for server channels
   */
  app.delete(
    '/:id/pin',
    {
      schema: {
        description: 'Unpin a message',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: {
            description: 'Message unpinned successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = request.user!.id;

      // Get message to check channel permission
      const message = await messageService.getMessage(id, true);
      if (message.channel_id) {
        const hasPermission = await permissionService.hasChannelPermission(userId, message.channel_id, PERMISSION_FLAGS.PIN_MESSAGES);
        if (!hasPermission) {
          return reply.code(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You do not have permission to unpin messages in this channel' }
          });
        }
      }

      const unpinnedMessage = await messageService.unpinMessage(id);

      return reply.send(successResponse(unpinnedMessage));
    }
  );
}

