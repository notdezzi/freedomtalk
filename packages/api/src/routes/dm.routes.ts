/**
 * DM Channel Routes
 * Handles DM and Group DM channels
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { dmChannelService, UpdateGroupDMRequest } from '../services/dm/dm-channel.service';
import { toDMChannelResponse } from '../services/dm/dm-channel.types';
import { messageService } from '../services/message/message.service';
import { dmNotificationService, NotificationLevel } from '../services/dm/dm-notification.service';
import { requireAuth } from '../middleware/auth.middleware';
import { logger } from '../config/logger';
import { messageRouter } from '../services/websocket/message.router';

// Validation schemas
const createDMSchema = z.object({
  recipient_id: z.string().min(18).max(20).optional(),
  recipients: z.array(z.string().min(18).max(20)).min(1).max(9).optional(),
  name: z.string().min(1).max(100).optional(),
  icon_url: z.string().url().max(500).optional(),
}).refine(
  (data) => data.recipient_id || (data.recipients && data.recipients.length > 0),
  { message: 'Either recipient_id or recipients must be provided' }
);

const updateGroupDMSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon_url: z.string().url().max(500).nullable().optional(),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const messagePaginationSchema = z.object({
  before: z.string().min(18).max(20).optional(),
  after: z.string().min(18).max(20).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const createMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  embeds: z.array(z.any()).max(10).optional(),
});

const updateMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

const updateNotificationSettingsSchema = z.object({
  is_muted: z.boolean().optional(),
  mute_until: z.coerce.date().nullable().optional(),
  notification_level: z.enum(['all', 'mentions', 'none']).optional(),
});

const muteDMSchema = z.object({
  duration: z.coerce.number().int().min(1).optional(),
});

// Helper to validate and parse request body
function parseBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

// Helper to validate querystring
function parseQuery<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export default async function dmRoutes(app: FastifyInstance) {
  // All DM routes require authentication
  app.addHook('onRequest', requireAuth);

  /**
   * POST /api/v1/users/@me/channels
   * Create a DM or Group DM
   */
  app.post('/users/@me/channels', async (request, reply) => {
    const userId = request.user!.id;
    const body = parseBody(createDMSchema, request.body);

    try {
      // Single DM (recipient_id)
      if (body.recipient_id && !body.recipients) {
        const dmChannel = await dmChannelService.createDM(userId, body.recipient_id);
        return reply.status(200).send(await toDMChannelResponse(dmChannel, dmChannel.participants, userId));
      }

      // Group DM (recipients array)
      if (body.recipients && body.recipients.length > 0) {
        const groupDM = await dmChannelService.createGroupDM(
          userId,
          body.recipients,
          body.name,
          body.icon_url
        );
        return reply.status(200).send(await toDMChannelResponse(groupDM, groupDM.participants, userId));
      }

      return reply.status(400).send({ error: 'Invalid request: provide recipient_id or recipients' });
    } catch (error: unknown) {
      const err = error as Error;
      logger.error({ error, userId }, 'Error creating DM channel');
      if (err.message?.includes('not found')) {
        return reply.status(404).send({ error: err.message });
      }
      if (err.message?.includes('cannot have more') || err.message?.includes('requires')) {
        return reply.status(409).send({ error: err.message });
      }
      return reply.status(500).send({ error: 'Failed to create DM channel' });
    }
  });

  /**
   * GET /api/v1/users/@me/channels
   * Get all DMs for the current user
   */
  app.get('/users/@me/channels', async (request, reply) => {
    const userId = request.user!.id;
    const { limit, offset } = parseQuery(paginationSchema, request.query);

    try {
      const result = await dmChannelService.getDMsByUser(userId, limit, offset);

      const dmChannels = await Promise.all(
        result.dmChannels.map((dm) => toDMChannelResponse(dm, dm.participants, userId))
      );

      return reply.status(200).send({
        dmChannels,
        total: result.total,
        limit,
        offset,
      });
    } catch (error) {
      logger.error({ error, userId }, 'Error fetching DM channels');
      return reply.status(500).send({ error: 'Failed to fetch DM channels' });
    }
  });

  /**
   * GET /api/v1/channels/:channelId
   * Get DM channel details
   */
  app.get('/channels/:channelId', async (request, reply) => {
    const userId = request.user!.id;
    const params = request.params as { channelId: string };
    const { channelId } = params;

    try {
      const dmChannel = await dmChannelService.getDMById(channelId);

      // Verify user is a participant
      const isParticipant = await dmChannelService.isParticipant(channelId, userId);
      if (!isParticipant) {
        return reply.status(403).send({ error: 'You are not a participant in this DM' });
      }

      return reply.status(200).send(await toDMChannelResponse(dmChannel, dmChannel.participants, userId));
    } catch (error: unknown) {
      const err = error as Error;
      logger.error({ error, channelId, userId }, 'Error fetching DM channel');
      if (err.message?.includes('not found')) {
        return reply.status(404).send({ error: 'DM channel not found' });
      }
      return reply.status(500).send({ error: 'Failed to fetch DM channel' });
    }
  });

  /**
   * PATCH /api/v1/channels/:channelId
   * Update group DM name or icon
   */
  app.patch('/channels/:channelId', async (request, reply) => {
    const userId = request.user!.id;
    const params = request.params as { channelId: string };
    const { channelId } = params;
    const body = parseBody(updateGroupDMSchema, request.body);
    const updates: UpdateGroupDMRequest = {
      name: body.name,
      iconUrl: body.icon_url ?? undefined,
    };

    try {
      const dmChannel = await dmChannelService.updateGroupDM(channelId, updates, userId);
      return reply.status(200).send(await toDMChannelResponse(dmChannel, dmChannel.participants, userId));
    } catch (error: unknown) {
      const err = error as Error;
      logger.error({ error, channelId, userId }, 'Error updating group DM');
      if (err.message?.includes('not found')) {
        return reply.status(404).send({ error: 'DM channel not found' });
      }
      if (err.message?.includes('Only the owner')) {
        return reply.status(403).send({ error: 'Only the owner can update the group DM' });
      }
      if (err.message?.includes('non-group DM')) {
        return reply.status(409).send({ error: 'Cannot update a non-group DM' });
      }
      return reply.status(500).send({ error: 'Failed to update group DM' });
    }
  });

  /**
   * DELETE /api/v1/channels/:channelId
   * Leave a DM or Group DM
   */
  app.delete('/channels/:channelId', async (request, reply) => {
    const userId = request.user!.id;
    const params = request.params as { channelId: string };
    const { channelId } = params;

    try {
      await dmChannelService.deleteDM(channelId, userId);
      return reply.status(204).send();
    } catch (error: unknown) {
      const err = error as Error;
      logger.error({ error, channelId, userId }, 'Error leaving DM');
      if (err.message?.includes('not found')) {
        return reply.status(404).send({ error: 'DM channel or participant not found' });
      }
      return reply.status(500).send({ error: 'Failed to leave DM' });
    }
  });

  /**
   * PUT /api/v1/channels/:channelId/recipients/:userId
   * Add a participant to a group DM
   */
  app.put('/channels/:channelId/recipients/:userId', async (request, reply) => {
    const requesterId = request.user!.id;
    const params = request.params as { channelId: string; userId: string };
    const { channelId, userId } = params;

    try {
      const dmChannel = await dmChannelService.addParticipant(channelId, userId, requesterId);
      return reply.status(200).send(await toDMChannelResponse(dmChannel, dmChannel.participants, userId));
    } catch (error: unknown) {
      const err = error as Error;
      logger.error({ error, channelId, userId, requesterId }, 'Error adding participant');
      if (err.message?.includes('not found')) {
        return reply.status(404).send({ error: 'DM channel or user not found' });
      }
      if (err.message?.includes('Only participants')) {
        return reply.status(403).send({ error: 'Only participants can add new members' });
      }
      if (err.message?.includes('already') || err.message?.includes('cannot have more')) {
        return reply.status(409).send({ error: err.message });
      }
      return reply.status(500).send({ error: 'Failed to add participant' });
    }
  });

  /**
   * DELETE /api/v1/channels/:channelId/recipients/:userId
   * Remove a participant from a group DM
   */
  app.delete('/channels/:channelId/recipients/:userId', async (request, reply) => {
    const requesterId = request.user!.id;
    const params = request.params as { channelId: string; userId: string };
    const { channelId, userId } = params;

    try {
      const dmChannel = await dmChannelService.removeParticipant(channelId, userId, requesterId);
      return reply.status(200).send(await toDMChannelResponse(dmChannel, dmChannel.participants, userId));
    } catch (error: unknown) {
      const err = error as Error;
      logger.error({ error, channelId, userId, requesterId }, 'Error removing participant');
      if (err.message?.includes('not found')) {
        return reply.status(404).send({ error: 'DM channel or participant not found' });
      }
      if (err.message?.includes('Only the owner')) {
        return reply.status(403).send({ error: 'Only the owner can remove other participants' });
      }
      return reply.status(500).send({ error: 'Failed to remove participant' });
    }
  });

  /**
   * POST /api/v1/channels/:channelId/messages
   * Create a DM message
   */
  app.post('/channels/:channelId/messages', async (request, reply) => {
    const userId = request.user!.id;
    const username = request.user!.username;
    const params = request.params as { channelId: string };
    const { channelId } = params;
    const body = parseBody(createMessageSchema, request.body);
    const { content, embeds } = body;

    try {
      // Verify user is a participant
      const isParticipant = await dmChannelService.isParticipant(channelId, userId);
      if (!isParticipant) {
        return reply.status(403).send({ error: 'You are not a participant in this DM' });
      }

      // Create message with DM channel ID
      const message = await messageService.createMessage({
        content,
        authorId: userId,
        dmChannelId: channelId,
        embeds,
      });

      logger.info({ messageId: message.id, channelId, userId }, 'DM message created');

      // Broadcast message to DM participants via WebSocket
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

      // Route message to DM participants
      try {
        await messageRouter.routeMessage(wsMessage);
      } catch (broadcastError) {
        logger.error({ error: broadcastError, messageId: message.id }, 'Failed to broadcast DM message');
        // Don't fail the request if broadcast fails
      }

      return reply.status(201).send({
        id: message.id,
        content: message.content,
        authorId: message.author_id,
        channelId: message.channel_id,
        createdAt: message.created_at.toISOString(),
        updatedAt: message.updated_at.toISOString(),
        isEdited: message.is_edited,
        embeds: message.embeds,
        mentions: message.mentions,
      });
    } catch (error: unknown) {
      const err = error as Error;
      logger.error({ error, channelId, userId }, 'Error creating DM message');
      if (err.message?.includes('not found')) {
        return reply.status(404).send({ error: 'DM channel not found' });
      }
      return reply.status(500).send({ error: 'Failed to create message' });
    }
  });

  /**
   * GET /api/v1/channels/:channelId/messages
   * Get DM message history
   */
  app.get('/channels/:channelId/messages', async (request, reply) => {
    const userId = request.user!.id;
    const params = request.params as { channelId: string };
    const { channelId } = params;
    const query = parseQuery(messagePaginationSchema, request.query);
    const { before, after, limit } = query;

    try {
      // Verify user is a participant
      const isParticipant = await dmChannelService.isParticipant(channelId, userId);
      if (!isParticipant) {
        return reply.status(403).send({ error: 'You are not a participant in this DM' });
      }

      // Get messages for this DM channel
      const result = await messageService.getMessages(
        { before, after, limit },
        { dmChannelId: channelId }
      );

      const messages = result.messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        authorId: msg.author_id,
        channelId: msg.channel_id,
        createdAt: msg.created_at.toISOString(),
        updatedAt: msg.updated_at.toISOString(),
        isEdited: msg.is_edited,
        isPinned: msg.is_pinned,
        author: msg.author,
      }));

      return reply.status(200).send({
        messages,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        prevCursor: result.prevCursor,
      });
    } catch (error) {
      logger.error({ error, channelId, userId }, 'Error fetching DM messages');
      return reply.status(500).send({ error: 'Failed to fetch messages' });
    }
  });

  /**
   * GET /api/v1/channels/:channelId/messages/:messageId
   * Get a specific DM message
   */
  app.get('/channels/:channelId/messages/:messageId', async (request, reply) => {
    const userId = request.user!.id;
    const params = request.params as { channelId: string; messageId: string };
    const { channelId, messageId } = params;

    try {
      // Verify user is a participant
      const isParticipant = await dmChannelService.isParticipant(channelId, userId);
      if (!isParticipant) {
        return reply.status(403).send({ error: 'You are not a participant in this DM' });
      }

      const message = await messageService.getMessage(messageId);

      // Verify message belongs to this DM channel
      if (message.channel_id !== channelId) {
        return reply.status(404).send({ error: 'Message not found' });
      }

      return reply.status(200).send({
        id: message.id,
        content: message.content,
        authorId: message.author_id,
        channelId: message.channel_id,
        createdAt: message.created_at.toISOString(),
        updatedAt: message.updated_at.toISOString(),
        isEdited: message.is_edited,
        isPinned: message.is_pinned,
      });
    } catch (error: unknown) {
      const err = error as Error;
      logger.error({ error, channelId, messageId, userId }, 'Error fetching DM message');
      if (err.message?.includes('not found')) {
        return reply.status(404).send({ error: 'Message not found' });
      }
      return reply.status(500).send({ error: 'Failed to fetch message' });
    }
  });

  /**
   * PATCH /api/v1/channels/:channelId/messages/:messageId
   * Edit a DM message
   */
  app.patch('/channels/:channelId/messages/:messageId', async (request, reply) => {
    const userId = request.user!.id;
    const params = request.params as { channelId: string; messageId: string };
    const { channelId, messageId } = params;
    const body = parseBody(updateMessageSchema, request.body);
    const { content } = body;

    try {
      // Verify user is a participant
      const isParticipant = await dmChannelService.isParticipant(channelId, userId);
      if (!isParticipant) {
        return reply.status(403).send({ error: 'You are not a participant in this DM' });
      }

      // Get message to verify ownership
      const message = await messageService.getMessage(messageId);

      // Verify message belongs to this DM channel
      if (message.channel_id !== channelId) {
        return reply.status(404).send({ error: 'Message not found' });
      }

      // Verify user is the author
      if (message.author_id !== userId) {
        return reply.status(403).send({ error: 'You can only edit your own messages' });
      }

      const updatedMessage = await messageService.updateMessage(messageId, content, userId);

      return reply.status(200).send({
        id: updatedMessage.id,
        content: updatedMessage.content,
        authorId: updatedMessage.author_id,
        channelId: updatedMessage.channel_id,
        createdAt: updatedMessage.created_at.toISOString(),
        updatedAt: updatedMessage.updated_at.toISOString(),
        isEdited: updatedMessage.is_edited,
        mentions: updatedMessage.mentions,
      });
    } catch (error: unknown) {
      const err = error as Error;
      logger.error({ error, channelId, messageId, userId }, 'Error editing DM message');
      if (err.message?.includes('not found')) {
        return reply.status(404).send({ error: 'Message not found' });
      }
      return reply.status(500).send({ error: 'Failed to edit message' });
    }
  });

  /**
   * DELETE /api/v1/channels/:channelId/messages/:messageId
   * Delete a DM message
   */
  app.delete('/channels/:channelId/messages/:messageId', async (request, reply) => {
    const userId = request.user!.id;
    const params = request.params as { channelId: string; messageId: string };
    const { channelId, messageId } = params;

    try {
      // Verify user is a participant
      const isParticipant = await dmChannelService.isParticipant(channelId, userId);
      if (!isParticipant) {
        return reply.status(403).send({ error: 'You are not a participant in this DM' });
      }

      // Get message to verify ownership
      const message = await messageService.getMessage(messageId);

      // Verify message belongs to this DM channel
      if (message.channel_id !== channelId) {
        return reply.status(404).send({ error: 'Message not found' });
      }

      // Verify user is the author
      if (message.author_id !== userId) {
        return reply.status(403).send({ error: 'You can only delete your own messages' });
      }

      await messageService.softDeleteMessage(messageId, userId);

      return reply.status(204).send();
    } catch (error: unknown) {
      const err = error as Error;
      logger.error({ error, channelId, messageId, userId }, 'Error deleting DM message');
      if (err.message?.includes('not found')) {
        return reply.status(404).send({ error: 'Message not found' });
      }
      return reply.status(500).send({ error: 'Failed to delete message' });
    }
  });

  // ==================== Notification Settings ====================

  /**
   * GET /api/v1/channels/:channelId/notification-settings
   * Get notification settings for a DM channel
   */
  app.get('/channels/:channelId/notification-settings', async (request, reply) => {
    const userId = request.user!.id;
    const params = request.params as { channelId: string };
    const { channelId } = params;

    try {
      // Verify user is a participant
      const isParticipant = await dmChannelService.isParticipant(channelId, userId);
      if (!isParticipant) {
        return reply.status(403).send({ error: 'You are not a participant in this DM' });
      }

      const settings = await dmNotificationService.getSettings(userId, channelId);

      return reply.status(200).send({
        isMuted: settings.is_muted,
        muteUntil: settings.mute_until ? settings.mute_until.toISOString() : null,
        notificationLevel: settings.notification_level,
      });
    } catch (error) {
      logger.error({ error, channelId, userId }, 'Error getting notification settings');
      return reply.status(500).send({ error: 'Failed to get notification settings' });
    }
  });

  /**
   * PUT /api/v1/channels/:channelId/notification-settings
   * Update notification settings for a DM channel
   */
  app.put('/channels/:channelId/notification-settings', async (request, reply) => {
    const userId = request.user!.id;
    const params = request.params as { channelId: string };
    const { channelId } = params;
    const body = parseBody(updateNotificationSettingsSchema, request.body);

    try {
      // Verify user is a participant
      const isParticipant = await dmChannelService.isParticipant(channelId, userId);
      if (!isParticipant) {
        return reply.status(403).send({ error: 'You are not a participant in this DM' });
      }

      const settings = await dmNotificationService.updateSettings(userId, channelId, {
        isMuted: body.is_muted,
        muteUntil: body.mute_until,
        notificationLevel: body.notification_level as NotificationLevel | undefined,
      });

      logger.info({ userId, channelId, updates: body }, 'Notification settings updated');

      return reply.status(200).send({
        isMuted: settings.is_muted,
        muteUntil: settings.mute_until ? settings.mute_until.toISOString() : null,
        notificationLevel: settings.notification_level,
      });
    } catch (error) {
      logger.error({ error, channelId, userId }, 'Error updating notification settings');
      return reply.status(500).send({ error: 'Failed to update notification settings' });
    }
  });

  /**
   * POST /api/v1/channels/:channelId/mute
   * Mute a DM channel
   */
  app.post('/channels/:channelId/mute', async (request, reply) => {
    const userId = request.user!.id;
    const params = request.params as { channelId: string };
    const { channelId } = params;
    const body = parseBody(muteDMSchema, request.body);
    const { duration } = body;

    try {
      // Verify user is a participant
      const isParticipant = await dmChannelService.isParticipant(channelId, userId);
      if (!isParticipant) {
        return reply.status(403).send({ error: 'You are not a participant in this DM' });
      }

      await dmNotificationService.muteDM(userId, channelId, duration);

      return reply.status(200).send({
        message: duration
          ? `DM muted for ${duration} minutes`
          : 'DM muted indefinitely',
      });
    } catch (error) {
      logger.error({ error, channelId, userId }, 'Error muting DM');
      return reply.status(500).send({ error: 'Failed to mute DM' });
    }
  });

  /**
   * DELETE /api/v1/channels/:channelId/mute
   * Unmute a DM channel
   */
  app.delete('/channels/:channelId/mute', async (request, reply) => {
    const userId = request.user!.id;
    const params = request.params as { channelId: string };
    const { channelId } = params;

    try {
      // Verify user is a participant
      const isParticipant = await dmChannelService.isParticipant(channelId, userId);
      if (!isParticipant) {
        return reply.status(403).send({ error: 'You are not a participant in this DM' });
      }

      await dmNotificationService.unmuteDM(userId, channelId);

      return reply.status(200).send({ message: 'DM unmuted' });
    } catch (error) {
      logger.error({ error, channelId, userId }, 'Error unmuting DM');
      return reply.status(500).send({ error: 'Failed to unmute DM' });
    }
  });
}
