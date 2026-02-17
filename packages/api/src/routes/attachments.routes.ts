/**
 * Attachment Routes
 * Handles file attachment upload, retrieval, and deletion
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import { requireAuth } from '../middleware/auth.middleware';
import { successResponse } from '../utils/errors';
import { attachmentService, UploadFile } from '../services/attachment/attachment.service';
import { logger } from '../config/logger';
import { VALIDATION } from '@freedomtalk/shared';

export default async function attachmentRoutes(app: FastifyInstance) {
  // Register multipart plugin for file uploads
  await app.register(multipart, {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 1000000, // Max field value size in bytes
      fields: 10, // Max number of non-file fields
      fileSize: VALIDATION.ATTACHMENT.MAX_FILE_SIZE, // Max file size
      files: VALIDATION.ATTACHMENT.MAX_PER_MESSAGE, // Max number of files
      headerPairs: 2000, // Max number of header key=>value pairs
    },
  });

  app.addHook('onRequest', requireAuth);

  /**
   * POST /api/v1/attachments/upload
   * Upload file attachments (returns attachment data for message creation)
   */
  app.post(
    '/upload',
    {
      schema: {
        description: 'Upload file attachments',
        tags: ['Attachments'],
        security: [{ bearerAuth: [] }],
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;

      try {
        const parts = request.parts();
        const files: UploadFile[] = [];

        for await (const part of parts) {
          if (part.type === 'file') {
            const buffer = await part.toBuffer();
            files.push({
              buffer,
              originalname: part.filename || 'unknown',
              mimetype: part.mimetype || 'application/octet-stream',
              size: buffer.length,
            });
          }
        }

        if (files.length === 0) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'NO_FILES',
              message: 'No files provided in upload',
            },
          });
        }

        // Upload files (not attached to a message yet - client will include IDs in message)
        const results = [];
        for (const file of files) {
          // Generate a temporary ID for the attachment
          const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

          // For now, store without message_id (will be updated when message is sent)
          // We'll use the minio service directly
          const objectPath = attachmentService.generateObjectPath(userId, file.originalname);
          const { minioService } = await import('../services/storage/minio.service');

          // Validate file
          const errors = attachmentService.validateFile(file);
          if (errors.length > 0) {
            return reply.code(400).send({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: `File validation failed: ${errors.map(e => e.message).join(', ')}`,
              },
            });
          }

          // Upload to MinIO
          await minioService.uploadFile(
            'freedomtalk-attachments',
            objectPath,
            file.buffer,
            file.size
          );

          // Get dimensions and thumbnail
          const dimensions = await attachmentService.getImageDimensions(file);
          const thumbnailPath = await attachmentService.generateThumbnail(file, objectPath);

          // Generate presigned URL
          const url = await minioService.getFileUrl('freedomtalk-attachments', objectPath);

          results.push({
            tempId,
            filename: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            objectPath,
            url,
            width: dimensions?.width || null,
            height: dimensions?.height || null,
            thumbnailPath,
          });
        }

        logger.info({
          userId,
          fileCount: results.length,
          filenames: results.map(r => r.filename),
        }, 'Files uploaded successfully');

        return reply.code(201).send(successResponse(results));
      } catch (error: any) {
        logger.error({ error, userId }, 'Error uploading files');

        if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
          return reply.code(413).send({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File size exceeds maximum of ${VALIDATION.ATTACHMENT.MAX_FILE_SIZE / 1024 / 1024}MB`,
            },
          });
        }

        return reply.code(500).send({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: 'Failed to upload files',
          },
        });
      }
    }
  );

  /**
   * POST /api/v1/messages/:messageId/attachments
   * Attach previously uploaded files to a message
   */
  app.post(
    '/:messageId/attachments',
    {
      schema: {
        description: 'Attach files to a message',
        tags: ['Messages', 'Attachments'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['messageId'],
          properties: {
            messageId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          required: ['attachments'],
          properties: {
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  filename: { type: 'string' },
                  size: { type: 'number' },
                  mimeType: { type: 'string' },
                  objectPath: { type: 'string' },
                  width: { type: 'number', nullable: true },
                  height: { type: 'number', nullable: true },
                  thumbnailPath: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        response: {
          201: {
            description: 'Attachments linked to message successfully',
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
    async (
      request: FastifyRequest<{
        Params: { messageId: string };
        Body: {
          attachments: Array<{
            filename: string;
            size: number;
            mimeType: string;
            objectPath: string;
            width?: number | null;
            height?: number | null;
            thumbnailPath?: string | null;
          }>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { messageId } = request.params;
      const userId = request.user!.id;
      const { attachments } = request.body;

      if (!attachments || attachments.length === 0) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'NO_ATTACHMENTS',
            message: 'No attachments provided',
          },
        });
      }

      try {
        const { generateSnowflakeId } = await import('../utils/snowflake');
        const { db } = await import('../config/database');
        const { minioService } = await import('../services/storage/minio.service');

        const results = [];

        for (const att of attachments) {
          const attachmentId = generateSnowflakeId();
          const now = new Date();

          // Insert attachment record linked to message
          const [attachment] = await db('message_attachments')
            .insert({
              id: attachmentId,
              message_id: messageId,
              filename: att.filename,
              size: att.size,
              mime_type: att.mimeType,
              object_path: att.objectPath,
              width: att.width || null,
              height: att.height || null,
              thumbnail_path: att.thumbnailPath || null,
              uploaded_by: userId,
              created_at: now,
            })
            .returning('*');

          // Generate presigned URL
          const url = await minioService.getFileUrl('freedomtalk-attachments', att.objectPath);

          results.push({
            ...attachment,
            url,
          });
        }

        logger.info({
          messageId,
          userId,
          attachmentCount: results.length,
        }, 'Attachments linked to message');

        return reply.code(201).send(successResponse(results));
      } catch (error: any) {
        logger.error({ error, messageId, userId }, 'Error linking attachments to message');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'ATTACHMENT_ERROR',
            message: 'Failed to link attachments to message',
          },
        });
      }
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
