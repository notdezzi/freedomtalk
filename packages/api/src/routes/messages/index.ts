/**
 * Message Routes
 * Handles message CRUD operations, pagination, and history
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createMessageSchema } from '@freedomtalk/shared';
import { validateBody } from '../../middleware/validation.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { successResponse } from '../../utils/errors';
import { messageService } from '../../services/message/message.service';

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
   */
  app.post(
    '/',
    {
      schema: {
        description: 'Create a new message',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 2000 },
            channelId: { type: 'string', minLength: 20, maxLength: 20 },
          },
        },
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
                },
              },
            },
          },
        },
      },
      preHandler: validateBody(createMessageSchema),
    },
    async (request: FastifyRequest<{ Body: { content: string; channelId?: string } }>, reply: FastifyReply) => {
      const { content, channelId } = request.body;
      const userId = (request as any).user.userId;

      const message = await messageService.createMessage({
        content,
        authorId: userId,
        channelId,
      });

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
            id: { type: 'string', minLength: 20, maxLength: 20 },
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
        response: {
          200: {
            description: 'Messages retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: GetMessagesQuerystring }>, reply: FastifyReply) => {
      const { before, after, limit, authorId, channelId, isPinned, search, startDate, endDate } = request.query;

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

      return reply.send(successResponse(result));
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
            id: { type: 'string', minLength: 20, maxLength: 20 },
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
      const userId = (request as any).user.userId;

      const message = await messageService.updateMessage(id, content, userId);

      return reply.send(successResponse(message));
    }
  );

  /**
   * DELETE /api/v1/messages/:id
   * Soft delete a message
   */
  app.delete(
    '/:id',
    {
      schema: {
        description: 'Soft delete a message',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', minLength: 20, maxLength: 20 },
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
      const userId = (request as any).user.userId;

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
            id: { type: 'string', minLength: 20, maxLength: 20 },
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
            id: { type: 'string', minLength: 20, maxLength: 20 },
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

      const message = await messageService.pinMessage(id);

      return reply.send(successResponse(message));
    }
  );

  /**
   * DELETE /api/v1/messages/:id/pin
   * Unpin a message
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
            id: { type: 'string', minLength: 20, maxLength: 20 },
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

      const message = await messageService.unpinMessage(id);

      return reply.send(successResponse(message));
    }
  );
}

