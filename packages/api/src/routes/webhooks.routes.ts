/**
 * Webhook Routes
 * Handles webhook CRUD operations and execution
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware';
import { successResponse } from '../utils/errors';
import { webhookService } from '../services/webhook/webhook.service';
import { serverMemberService } from '../services/server/server-member.service';
import { serverService } from '../services/server/server.service';
import { roleService } from '../services/server/role.service';
import { PERMISSION_FLAGS, Permissions } from '@freedomtalk/shared';
import { ApiError, ApiErrorCode } from '../types/api.types';
import { logger } from '../config/logger';

// Zod schemas for validation
const serverIdParamSchema = z.object({
  serverId: z.string().length(20, 'Invalid server ID'),
});

const webhookIdParamSchema = z.object({
  serverId: z.string().length(20, 'Invalid server ID'),
  webhookId: z.string().length(20, 'Invalid webhook ID'),
});

const channelIdParamSchema = z.object({
  channelId: z.string().length(20, 'Invalid channel ID'),
});

const executeWebhookSchema = z.object({
  content: z.string().min(1).max(2000, 'Content must be between 1 and 2000 characters'),
  username: z.string().min(1).max(80).optional(),
  avatar_url: z.string().url().optional(),
  embeds: z.array(z.record(z.unknown())).max(10).optional(),
});

const createWebhookSchema = z.object({
  name: z.string().min(1).max(80, 'Name must be between 1 and 80 characters'),
  avatar: z.string().url().optional(),
  channel_id: z.string().length(20, 'Invalid channel ID'),
});

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(80, 'Name must be between 1 and 80 characters').optional(),
  avatar: z.string().url().nullable().optional(),
  channel_id: z.string().length(20, 'Invalid channel ID').optional(),
});

/**
 * Check if user has MANAGE_WEBHOOKS permission in the server
 */
async function canManageWebhooks(serverId: string, userId: string): Promise<boolean> {
  const member = await serverMemberService.getMember(serverId, userId);
  if (!member) {
    return false;
  }

  // Server owner can always manage webhooks
  const server = await serverService.getServer(serverId);
  if (server && server.owner_id === userId) {
    return true;
  }

  // Check permissions from roles
  const permissions = await roleService.calculateMemberPermissions(serverId, userId);
  if (Permissions.has(permissions, PERMISSION_FLAGS.ADMINISTRATOR) ||
      Permissions.has(permissions, PERMISSION_FLAGS.MANAGE_SERVER)) {
    return true;
  }

  return false;
}

/**
 * Register webhook routes
 */
export default async function webhookRoutes(app: FastifyInstance) {
  // Get all webhooks for a server
  app.get<{ Params: z.infer<typeof serverIdParamSchema> }>(
    '/servers/:serverId/webhooks',
    {
      onRequest: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof serverIdParamSchema> }>) => {
      const { serverId } = request.params;
      const userId = request.user!.id;

      // Check permissions
      const canManage = await canManageWebhooks(serverId, userId);
      if (!canManage) {
        throw new ApiError(ApiErrorCode.FORBIDDEN, 'You do not have permission to manage webhooks', 403);
      }

      const webhooks = await webhookService.getServerWebhooks(serverId);

      // Remove tokens from response for security
      const safeWebhooks = webhooks.map(w => ({
        id: w.id,
        server_id: w.server_id,
        channel_id: w.channel_id,
        name: w.name,
        avatar: w.avatar,
        created_by: w.created_by,
        created_at: w.created_at,
        // Include token only for display (masked)
        token: `********${w.token.slice(-4)}`,
      }));

      return successResponse(safeWebhooks);
    }
  );

  // Get webhooks for a channel
  app.get<{ Params: z.infer<typeof channelIdParamSchema> }>(
    '/channels/:channelId/webhooks',
    {
      onRequest: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof channelIdParamSchema> }>) => {
      const { channelId } = request.params;

      const webhooks = await webhookService.getChannelWebhooks(channelId);

      const safeWebhooks = webhooks.map(w => ({
        id: w.id,
        server_id: w.server_id,
        channel_id: w.channel_id,
        name: w.name,
        avatar: w.avatar,
        created_by: w.created_by,
        created_at: w.created_at,
        token: `********${w.token.slice(-4)}`,
      }));

      return successResponse(safeWebhooks);
    }
  );

  // Create a webhook
  app.post<{ Params: z.infer<typeof serverIdParamSchema>; Body: z.infer<typeof createWebhookSchema> }>(
    '/servers/:serverId/webhooks',
    {
      onRequest: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof serverIdParamSchema>; Body: z.infer<typeof createWebhookSchema> }>) => {
      const { serverId } = request.params;
      const { name, avatar, channel_id } = request.body;
      const userId = request.user!.id;

      // Check permissions
      const canManage = await canManageWebhooks(serverId, userId);
      if (!canManage) {
        throw new ApiError(ApiErrorCode.FORBIDDEN, 'You do not have permission to manage webhooks', 403);
      }

      const webhook = await webhookService.createWebhook({
        serverId,
        channelId: channel_id,
        name,
        avatar,
        createdBy: userId,
      });

      logger.info({ webhookId: webhook.id, serverId, userId }, 'Webhook created');

      // Return with full token (only time it's shown)
      return successResponse({
        id: webhook.id,
        server_id: webhook.server_id,
        channel_id: webhook.channel_id,
        name: webhook.name,
        avatar: webhook.avatar,
        token: webhook.token,
        created_by: webhook.created_by,
        created_at: webhook.created_at,
      });
    }
  );

  // Get a specific webhook
  app.get<{ Params: z.infer<typeof webhookIdParamSchema> }>(
    '/servers/:serverId/webhooks/:webhookId',
    {
      onRequest: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof webhookIdParamSchema> }>) => {
      const { serverId, webhookId } = request.params;
      const userId = request.user!.id;

      // Check permissions
      const canManage = await canManageWebhooks(serverId, userId);
      if (!canManage) {
        throw new ApiError(ApiErrorCode.FORBIDDEN, 'You do not have permission to manage webhooks', 403);
      }

      const webhook = await webhookService.getWebhookById(webhookId);
      if (!webhook || webhook.server_id !== serverId) {
        throw new ApiError(ApiErrorCode.NOT_FOUND, 'Webhook not found', 404);
      }

      return successResponse({
        id: webhook.id,
        server_id: webhook.server_id,
        channel_id: webhook.channel_id,
        name: webhook.name,
        avatar: webhook.avatar,
        token: `********${webhook.token.slice(-4)}`,
        created_by: webhook.created_by,
        created_at: webhook.created_at,
      });
    }
  );

  // Update a webhook
  app.patch<{ Params: z.infer<typeof webhookIdParamSchema>; Body: z.infer<typeof updateWebhookSchema> }>(
    '/servers/:serverId/webhooks/:webhookId',
    {
      onRequest: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof webhookIdParamSchema>; Body: z.infer<typeof updateWebhookSchema> }>) => {
      const { serverId, webhookId } = request.params;
      const userId = request.user!.id;

      // Check permissions
      const canManage = await canManageWebhooks(serverId, userId);
      if (!canManage) {
        throw new ApiError(ApiErrorCode.FORBIDDEN, 'You do not have permission to manage webhooks', 403);
      }

      const existingWebhook = await webhookService.getWebhookById(webhookId);
      if (!existingWebhook || existingWebhook.server_id !== serverId) {
        throw new ApiError(ApiErrorCode.NOT_FOUND, 'Webhook not found', 404);
      }

      const updateData: { name?: string; avatar?: string; channelId?: string } = {};
      if (request.body.name) updateData.name = request.body.name;
      if (request.body.avatar !== undefined) updateData.avatar = request.body.avatar ?? undefined;
      if (request.body.channel_id) updateData.channelId = request.body.channel_id;

      const webhook = await webhookService.updateWebhook(webhookId, updateData);

      return successResponse({
        id: webhook.id,
        server_id: webhook.server_id,
        channel_id: webhook.channel_id,
        name: webhook.name,
        avatar: webhook.avatar,
        token: `********${webhook.token.slice(-4)}`,
        created_by: webhook.created_by,
        created_at: webhook.created_at,
        updated_at: webhook.updated_at,
      });
    }
  );

  // Delete a webhook
  app.delete<{ Params: z.infer<typeof webhookIdParamSchema> }>(
    '/servers/:serverId/webhooks/:webhookId',
    {
      onRequest: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof webhookIdParamSchema> }>) => {
      const { serverId, webhookId } = request.params;
      const userId = request.user!.id;

      // Check permissions
      const canManage = await canManageWebhooks(serverId, userId);
      if (!canManage) {
        throw new ApiError(ApiErrorCode.FORBIDDEN, 'You do not have permission to manage webhooks', 403);
      }

      const existingWebhook = await webhookService.getWebhookById(webhookId);
      if (!existingWebhook || existingWebhook.server_id !== serverId) {
        throw new ApiError(ApiErrorCode.NOT_FOUND, 'Webhook not found', 404);
      }

      await webhookService.deleteWebhook(webhookId);
      logger.info({ webhookId, serverId, userId }, 'Webhook deleted');

      return successResponse({ success: true });
    }
  );

  // Regenerate webhook token
  app.post<{ Params: z.infer<typeof webhookIdParamSchema> }>(
    '/servers/:serverId/webhooks/:webhookId/regenerate',
    {
      onRequest: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof webhookIdParamSchema> }>) => {
      const { serverId, webhookId } = request.params;
      const userId = request.user!.id;

      // Check permissions
      const canManage = await canManageWebhooks(serverId, userId);
      if (!canManage) {
        throw new ApiError(ApiErrorCode.FORBIDDEN, 'You do not have permission to manage webhooks', 403);
      }

      const existingWebhook = await webhookService.getWebhookById(webhookId);
      if (!existingWebhook || existingWebhook.server_id !== serverId) {
        throw new ApiError(ApiErrorCode.NOT_FOUND, 'Webhook not found', 404);
      }

      const newToken = await webhookService.regenerateToken(webhookId);
      logger.info({ webhookId, serverId, userId }, 'Webhook token regenerated');

      return successResponse({ token: newToken });
    }
  );

  // Execute webhook (public endpoint - uses token for auth)
  app.post<{ Params: { webhookId: string; token: string }; Body: z.infer<typeof executeWebhookSchema> }>(
    '/webhooks/:webhookId/:token',
    {},
    async (request: FastifyRequest<{ Params: { webhookId: string; token: string }; Body: z.infer<typeof executeWebhookSchema> }>) => {
      const { webhookId, token } = request.params;
      const { content, username, avatar_url, embeds } = request.body;

      // Verify webhook exists and token matches
      const webhook = await webhookService.getWebhookById(webhookId);
      if (!webhook || webhook.token !== token) {
        throw new ApiError(ApiErrorCode.UNAUTHORIZED, 'Invalid webhook', 401);
      }

      // Execute the webhook
      const result = await webhookService.executeWebhook(token, content, {
        username,
        avatarUrl: avatar_url,
        embeds,
      });

      if (!result.success) {
        throw new ApiError(ApiErrorCode.EXTERNAL_SERVICE_ERROR, result.error || 'Failed to execute webhook', 502);
      }

      return successResponse({ success: true, message_id: result.messageId });
    }
  );
}
