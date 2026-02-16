import { z } from 'zod';
import { dmChannelService } from '../services/dm/dm-channel.service';
import { toDMChannelResponse } from '../services/dm/dm-channel.types';
import { messageService } from '../services/message/message.service';
import { dmNotificationService } from '../services/dm/dm-notification.service';
import { requireAuth } from '../middleware/auth.middleware';
import { logger } from '../config/logger';
const createDMSchema = z.object({
    recipient_id: z.string().length(20).optional(),
    recipients: z.array(z.string().length(20)).min(1).max(9).optional(),
    name: z.string().min(1).max(100).optional(),
    icon_url: z.string().url().max(500).optional(),
}).refine((data) => data.recipient_id || (data.recipients && data.recipients.length > 0), { message: 'Either recipient_id or recipients must be provided' });
const updateGroupDMSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    icon_url: z.string().url().max(500).nullable().optional(),
});
const paginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});
const messagePaginationSchema = z.object({
    before: z.string().length(20).optional(),
    after: z.string().length(20).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});
const createMessageSchema = z.object({
    content: z.string().min(1).max(2000),
    embeds: z.array(z.any()).max(10).optional(),
});
const updateMessageSchema = z.object({
    content: z.string().min(1).max(2000),
});
export default async function dmRoutes(app) {
    app.addHook('onRequest', requireAuth);
    app.post('/users/@me/channels', {
        schema: {
            body: createDMSchema,
            description: 'Create a DM or Group DM channel',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'DM channel created',
                    type: 'object',
                },
                400: { description: 'Invalid request body' },
                401: { description: 'Unauthorized' },
                404: { description: 'User not found' },
                409: { description: 'Conflict (max participants exceeded)' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const body = request.body;
        try {
            if (body.recipient_id && !body.recipients) {
                const dmChannel = await dmChannelService.createDM(userId, body.recipient_id);
                return reply.status(200).send(toDMChannelResponse(dmChannel, dmChannel.participants));
            }
            if (body.recipients && body.recipients.length > 0) {
                const groupDM = await dmChannelService.createGroupDM(userId, body.recipients, body.name, body.icon_url);
                return reply.status(200).send(toDMChannelResponse(groupDM, groupDM.participants));
            }
            return reply.status(400).send({ error: 'Invalid request: provide recipient_id or recipients' });
        }
        catch (error) {
            logger.error({ error, userId }, 'Error creating DM channel');
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message?.includes('cannot have more') || error.message?.includes('requires')) {
                return reply.status(409).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Failed to create DM channel' });
        }
    });
    app.get('/users/@me/channels', {
        schema: {
            querystring: paginationSchema,
            description: 'Get all DM channels for the current user',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'List of DM channels',
                    type: 'object',
                },
                401: { description: 'Unauthorized' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { limit, offset } = request.query;
        try {
            const result = await dmChannelService.getDMsByUser(userId, limit, offset);
            const dmChannels = result.dmChannels.map((dm) => toDMChannelResponse(dm, dm.participants));
            return reply.status(200).send({
                dmChannels,
                total: result.total,
                limit,
                offset,
            });
        }
        catch (error) {
            logger.error({ error, userId }, 'Error fetching DM channels');
            return reply.status(500).send({ error: 'Failed to fetch DM channels' });
        }
    });
    app.get('/channels/:channelId', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
            }),
            description: 'Get DM channel details',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'DM channel details',
                    type: 'object',
                },
                401: { description: 'Unauthorized' },
                403: { description: 'Not a participant' },
                404: { description: 'DM channel not found' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { channelId } = request.params;
        try {
            const dmChannel = await dmChannelService.getDMById(channelId);
            const isParticipant = await dmChannelService.isParticipant(channelId, userId);
            if (!isParticipant) {
                return reply.status(403).send({ error: 'You are not a participant in this DM' });
            }
            return reply.status(200).send(toDMChannelResponse(dmChannel, dmChannel.participants));
        }
        catch (error) {
            logger.error({ error, channelId, userId }, 'Error fetching DM channel');
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: 'DM channel not found' });
            }
            return reply.status(500).send({ error: 'Failed to fetch DM channel' });
        }
    });
    app.patch('/channels/:channelId', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
            }),
            body: updateGroupDMSchema,
            description: 'Update group DM name or icon',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'Group DM updated',
                    type: 'object',
                },
                401: { description: 'Unauthorized' },
                403: { description: 'Not the owner' },
                404: { description: 'DM channel not found' },
                409: { description: 'Cannot update non-group DM' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { channelId } = request.params;
        const updates = {
            name: request.body.name,
            iconUrl: request.body.icon_url ?? undefined,
        };
        try {
            const dmChannel = await dmChannelService.updateGroupDM(channelId, updates, userId);
            return reply.status(200).send(toDMChannelResponse(dmChannel, dmChannel.participants));
        }
        catch (error) {
            logger.error({ error, channelId, userId }, 'Error updating group DM');
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: 'DM channel not found' });
            }
            if (error.message?.includes('Only the owner')) {
                return reply.status(403).send({ error: 'Only the owner can update the group DM' });
            }
            if (error.message?.includes('non-group DM')) {
                return reply.status(409).send({ error: 'Cannot update a non-group DM' });
            }
            return reply.status(500).send({ error: 'Failed to update group DM' });
        }
    });
    app.delete('/channels/:channelId', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
            }),
            description: 'Leave a DM or Group DM',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                204: { description: 'Left DM successfully' },
                401: { description: 'Unauthorized' },
                404: { description: 'DM channel or participant not found' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { channelId } = request.params;
        try {
            await dmChannelService.deleteDM(channelId, userId);
            return reply.status(204).send();
        }
        catch (error) {
            logger.error({ error, channelId, userId }, 'Error leaving DM');
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: 'DM channel or participant not found' });
            }
            return reply.status(500).send({ error: 'Failed to leave DM' });
        }
    });
    app.put('/channels/:channelId/recipients/:userId', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
                userId: z.string().length(20),
            }),
            description: 'Add a participant to a group DM',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'Participant added',
                    type: 'object',
                },
                401: { description: 'Unauthorized' },
                403: { description: 'Not a participant' },
                404: { description: 'DM channel or user not found' },
                409: { description: 'Already a participant or max participants exceeded' },
            },
        },
    }, async (request, reply) => {
        const requesterId = request.user.id;
        const { channelId, userId } = request.params;
        try {
            const dmChannel = await dmChannelService.addParticipant(channelId, userId, requesterId);
            return reply.status(200).send(toDMChannelResponse(dmChannel, dmChannel.participants));
        }
        catch (error) {
            logger.error({ error, channelId, userId, requesterId }, 'Error adding participant');
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: 'DM channel or user not found' });
            }
            if (error.message?.includes('Only participants')) {
                return reply.status(403).send({ error: 'Only participants can add new members' });
            }
            if (error.message?.includes('already') || error.message?.includes('cannot have more')) {
                return reply.status(409).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Failed to add participant' });
        }
    });
    app.delete('/channels/:channelId/recipients/:userId', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
                userId: z.string().length(20),
            }),
            description: 'Remove a participant from a group DM',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'Participant removed',
                    type: 'object',
                },
                401: { description: 'Unauthorized' },
                403: { description: 'Not authorized to remove this participant' },
                404: { description: 'DM channel or participant not found' },
            },
        },
    }, async (request, reply) => {
        const requesterId = request.user.id;
        const { channelId, userId } = request.params;
        try {
            const dmChannel = await dmChannelService.removeParticipant(channelId, userId, requesterId);
            return reply.status(200).send(toDMChannelResponse(dmChannel, dmChannel.participants));
        }
        catch (error) {
            logger.error({ error, channelId, userId, requesterId }, 'Error removing participant');
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: 'DM channel or participant not found' });
            }
            if (error.message?.includes('Only the owner')) {
                return reply.status(403).send({ error: 'Only the owner can remove other participants' });
            }
            return reply.status(500).send({ error: 'Failed to remove participant' });
        }
    });
    app.post('/channels/:channelId/messages', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
            }),
            body: createMessageSchema,
            description: 'Create a DM message',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                201: {
                    description: 'Message created',
                    type: 'object',
                },
                401: { description: 'Unauthorized' },
                403: { description: 'Not a participant' },
                404: { description: 'DM channel not found' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { channelId } = request.params;
        const { content, embeds } = request.body;
        try {
            const isParticipant = await dmChannelService.isParticipant(channelId, userId);
            if (!isParticipant) {
                return reply.status(403).send({ error: 'You are not a participant in this DM' });
            }
            const message = await messageService.createMessage({
                content,
                authorId: userId,
                channelId,
                embeds,
            });
            logger.info({ messageId: message.id, channelId, userId }, 'DM message created');
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
        }
        catch (error) {
            logger.error({ error, channelId, userId }, 'Error creating DM message');
            return reply.status(500).send({ error: 'Failed to create message' });
        }
    });
    app.get('/channels/:channelId/messages', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
            }),
            querystring: messagePaginationSchema,
            description: 'Get DM message history',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'List of messages',
                    type: 'object',
                },
                401: { description: 'Unauthorized' },
                403: { description: 'Not a participant' },
                404: { description: 'DM channel not found' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { channelId } = request.params;
        const { before, after, limit } = request.query;
        try {
            const isParticipant = await dmChannelService.isParticipant(channelId, userId);
            if (!isParticipant) {
                return reply.status(403).send({ error: 'You are not a participant in this DM' });
            }
            const result = await messageService.getMessages({ before, after, limit }, { channelId });
            const messages = result.messages.map((msg) => ({
                id: msg.id,
                content: msg.content,
                authorId: msg.author_id,
                channelId: msg.channel_id,
                createdAt: msg.created_at.toISOString(),
                updatedAt: msg.updated_at.toISOString(),
                isEdited: msg.is_edited,
                isPinned: msg.is_pinned,
            }));
            return reply.status(200).send({
                messages,
                hasMore: result.hasMore,
                nextCursor: result.nextCursor,
                prevCursor: result.prevCursor,
            });
        }
        catch (error) {
            logger.error({ error, channelId, userId }, 'Error fetching DM messages');
            return reply.status(500).send({ error: 'Failed to fetch messages' });
        }
    });
    app.get('/channels/:channelId/messages/:messageId', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
                messageId: z.string().length(20),
            }),
            description: 'Get a specific DM message',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'Message details',
                    type: 'object',
                },
                401: { description: 'Unauthorized' },
                403: { description: 'Not a participant' },
                404: { description: 'Message not found' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { channelId, messageId } = request.params;
        try {
            const isParticipant = await dmChannelService.isParticipant(channelId, userId);
            if (!isParticipant) {
                return reply.status(403).send({ error: 'You are not a participant in this DM' });
            }
            const message = await messageService.getMessage(messageId);
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
        }
        catch (error) {
            logger.error({ error, channelId, messageId, userId }, 'Error fetching DM message');
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: 'Message not found' });
            }
            return reply.status(500).send({ error: 'Failed to fetch message' });
        }
    });
    app.patch('/channels/:channelId/messages/:messageId', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
                messageId: z.string().length(20),
            }),
            body: updateMessageSchema,
            description: 'Edit a DM message',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'Message updated',
                    type: 'object',
                },
                401: { description: 'Unauthorized' },
                403: { description: 'Not the author' },
                404: { description: 'Message not found' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { channelId, messageId } = request.params;
        const { content } = request.body;
        try {
            const isParticipant = await dmChannelService.isParticipant(channelId, userId);
            if (!isParticipant) {
                return reply.status(403).send({ error: 'You are not a participant in this DM' });
            }
            const message = await messageService.getMessage(messageId);
            if (message.channel_id !== channelId) {
                return reply.status(404).send({ error: 'Message not found' });
            }
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
        }
        catch (error) {
            logger.error({ error, channelId, messageId, userId }, 'Error editing DM message');
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: 'Message not found' });
            }
            return reply.status(500).send({ error: 'Failed to edit message' });
        }
    });
    app.delete('/channels/:channelId/messages/:messageId', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
                messageId: z.string().length(20),
            }),
            description: 'Delete a DM message',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                204: { description: 'Message deleted' },
                401: { description: 'Unauthorized' },
                403: { description: 'Not the author' },
                404: { description: 'Message not found' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { channelId, messageId } = request.params;
        try {
            const isParticipant = await dmChannelService.isParticipant(channelId, userId);
            if (!isParticipant) {
                return reply.status(403).send({ error: 'You are not a participant in this DM' });
            }
            const message = await messageService.getMessage(messageId);
            if (message.channel_id !== channelId) {
                return reply.status(404).send({ error: 'Message not found' });
            }
            if (message.author_id !== userId) {
                return reply.status(403).send({ error: 'You can only delete your own messages' });
            }
            await messageService.softDeleteMessage(messageId, userId);
            return reply.status(204).send();
        }
        catch (error) {
            logger.error({ error, channelId, messageId, userId }, 'Error deleting DM message');
            if (error.message?.includes('not found')) {
                return reply.status(404).send({ error: 'Message not found' });
            }
            return reply.status(500).send({ error: 'Failed to delete message' });
        }
    });
    app.get('/channels/:channelId/notification-settings', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
            }),
            description: 'Get notification settings for a DM channel',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'Notification settings',
                    type: 'object',
                },
                401: { description: 'Unauthorized' },
                403: { description: 'Not a participant' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { channelId } = request.params;
        try {
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
        }
        catch (error) {
            logger.error({ error, channelId, userId }, 'Error getting notification settings');
            return reply.status(500).send({ error: 'Failed to get notification settings' });
        }
    });
    const updateNotificationSettingsSchema = z.object({
        is_muted: z.boolean().optional(),
        mute_until: z.coerce.date().nullable().optional(),
        notification_level: z.enum(['all', 'mentions', 'none']).optional(),
    });
    app.put('/channels/:channelId/notification-settings', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
            }),
            body: updateNotificationSettingsSchema,
            description: 'Update notification settings for a DM channel',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'Notification settings updated',
                    type: 'object',
                },
                401: { description: 'Unauthorized' },
                403: { description: 'Not a participant' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { channelId } = request.params;
        const body = request.body;
        try {
            const isParticipant = await dmChannelService.isParticipant(channelId, userId);
            if (!isParticipant) {
                return reply.status(403).send({ error: 'You are not a participant in this DM' });
            }
            const settings = await dmNotificationService.updateSettings(userId, channelId, {
                isMuted: body.is_muted,
                muteUntil: body.mute_until,
                notificationLevel: body.notification_level,
            });
            logger.info({ userId, channelId, updates: body }, 'Notification settings updated');
            return reply.status(200).send({
                isMuted: settings.is_muted,
                muteUntil: settings.mute_until ? settings.mute_until.toISOString() : null,
                notificationLevel: settings.notification_level,
            });
        }
        catch (error) {
            logger.error({ error, channelId, userId }, 'Error updating notification settings');
            return reply.status(500).send({ error: 'Failed to update notification settings' });
        }
    });
    const muteDMSchema = z.object({
        duration: z.coerce.number().int().min(1).optional(),
    });
    app.post('/channels/:channelId/mute', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
            }),
            body: muteDMSchema,
            description: 'Mute a DM channel',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: { description: 'DM muted' },
                401: { description: 'Unauthorized' },
                403: { description: 'Not a participant' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { channelId } = request.params;
        const { duration } = request.body;
        try {
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
        }
        catch (error) {
            logger.error({ error, channelId, userId }, 'Error muting DM');
            return reply.status(500).send({ error: 'Failed to mute DM' });
        }
    });
    app.delete('/channels/:channelId/mute', {
        schema: {
            params: z.object({
                channelId: z.string().length(20),
            }),
            description: 'Unmute a DM channel',
            tags: ['dm'],
            security: [{ bearerAuth: [] }],
            response: {
                200: { description: 'DM unmuted' },
                401: { description: 'Unauthorized' },
                403: { description: 'Not a participant' },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { channelId } = request.params;
        try {
            const isParticipant = await dmChannelService.isParticipant(channelId, userId);
            if (!isParticipant) {
                return reply.status(403).send({ error: 'You are not a participant in this DM' });
            }
            await dmNotificationService.unmuteDM(userId, channelId);
            return reply.status(200).send({ message: 'DM unmuted' });
        }
        catch (error) {
            logger.error({ error, channelId, userId }, 'Error unmuting DM');
            return reply.status(500).send({ error: 'Failed to unmute DM' });
        }
    });
}
//# sourceMappingURL=dm.routes.js.map