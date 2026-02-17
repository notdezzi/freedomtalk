/**
 * Attachment Routes
 * Handles file attachment upload, retrieval, and deletion
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../middleware/auth.middleware';
import { successResponse } from '../utils/errors';
import { attachmentService } from '../services/attachment/attachment.service';
import { logger } from '../config/logger';

export default async function attachmentRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAuth);

  /**
   * POST /api/v1/messages/:messageId/attachments
   * Upload file attachments to a message
   */
  app.post(
    '/:messageId/attachments',
    {
      schema: {
        description: 'Upload file attachments to a message',
        tags: ['Messages', 'Attachments'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['messageId'],
          properties: {
            messageId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          201: {
            description: 'Attachments uploaded successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest<{ Params: { messageId: string } }>, reply: FastifyReply) => {
      return reply.code(501).send({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Multipart file upload not yet implemented - use base64 encoded content for now',
        },
      });
    }
  );

  /**
   * GET /api/v1/messages/:messageId/attachments
   * Get all attachments for a message
   */
  app.get(
    '/:messageId/attachments',
    {
      schema: {
        description: 'Get all attachments for a message',
        tags: ['Messages', 'Attachments'],
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
            description: 'Attachments retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { messageId: string } }>, reply: FastifyReply) => {
      const { messageId } = request.params;
      const attachments = await attachmentService.getAttachmentsByMessage(messageId);
      return reply.send(successResponse(attachments));
    }
  );

  /**
   * DELETE /api/v1/attachments/:attachmentId
   * Delete an attachment
   */
  app.delete(
    '/attachments/:attachmentId',
    {
      schema: {
        description: 'Delete an attachment',
        tags: ['Attachments'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['attachmentId'],
          properties: {
            attachmentId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          204: { description: 'Attachment deleted successfully', type: 'null' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { attachmentId: string } }>, reply: FastifyReply) => {
      const { attachmentId } = request.params;
      const userId = request.user!.id;

      try {
        await attachmentService.deleteAttachment(attachmentId, userId);
        return reply.code(204).send();
      } catch (error: any) {
        logger.error({ error, attachmentId, userId }, 'Error deleting attachment');

        if (error.name === 'NotFoundError') {
          return reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Attachment not found' },
          });
        }

        if (error.name === 'ValidationError') {
          return reply.code(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: error.message },
          });
        }

        return reply.code(500).send({
          success: false,
          error: { code: 'DELETE_ERROR', message: 'Failed to delete attachment' },
        });
      }
    }
  );
}
