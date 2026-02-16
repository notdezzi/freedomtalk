import { z } from 'zod';
import { logger } from '../../../config/logger';
import { WS_EVENTS, VALIDATION } from '@freedomtalk/shared';
import { messageService } from '../../message/message.service';
import { messageRouter } from '../message.router';
const messageCreateSchema = z.object({
    content: z.string().min(1).max(2000),
    channelId: z.string().min(1),
    embeds: z.array(z.any()).max(VALIDATION.EMBED.MAX_PER_MESSAGE).optional(),
});
const messageUpdateSchema = z.object({
    messageId: z.string().min(1),
    content: z.string().min(1).max(2000),
});
const messageDeleteSchema = z.object({
    messageId: z.string().min(1),
});
export async function handleMessageCreate(socket, data) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
        const validation = messageCreateSchema.safeParse(data);
        if (!validation.success) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'INVALID_DATA',
                message: 'Invalid message data',
                errors: validation.error.errors,
            });
            return;
        }
        const { content, channelId, embeds } = validation.data;
        const message = await messageService.createMessage({
            content,
            authorId: user.id,
            channelId,
            embeds,
        });
        const wsMessage = {
            id: message.id,
            content: message.content,
            authorId: message.author_id,
            channelId: message.channel_id,
            createdAt: message.created_at.toISOString(),
            updatedAt: message.updated_at.toISOString(),
            isEdited: message.is_edited,
            isDeleted: message.is_deleted,
            embeds: message.embeds?.map(embed => ({
                ...embed,
                timestamp: embed.timestamp instanceof Date ? embed.timestamp.toISOString() : embed.timestamp,
            })),
        };
        await messageRouter.routeMessage(wsMessage);
        socket.emit('message:ack', {
            messageId: message.id,
            timestamp: new Date().toISOString(),
        });
        logger.info({ userId: user.id, messageId: message.id, channelId }, 'Message created via WebSocket');
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling message create');
        socket.emit(WS_EVENTS.ERROR, {
            code: 'MESSAGE_CREATE_ERROR',
            message: 'Failed to create message',
        });
    }
}
export async function handleMessageUpdate(socket, data) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
        const validation = messageUpdateSchema.safeParse(data);
        if (!validation.success) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'INVALID_DATA',
                message: 'Invalid message update data',
                errors: validation.error.errors,
            });
            return;
        }
        const { messageId, content } = validation.data;
        const existingMessage = await messageService.getMessage(messageId);
        if (existingMessage.author_id !== user.id) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'Not authorized to edit this message',
            });
            return;
        }
        const updatedMessage = await messageService.updateMessage(messageId, content, user.id);
        const wsMessage = {
            id: updatedMessage.id,
            content: updatedMessage.content,
            authorId: updatedMessage.author_id,
            channelId: updatedMessage.channel_id,
            createdAt: updatedMessage.created_at.toISOString(),
            updatedAt: updatedMessage.updated_at.toISOString(),
            isEdited: updatedMessage.is_edited,
            isDeleted: updatedMessage.is_deleted,
        };
        if (updatedMessage.channel_id) {
            const { messageBroadcaster } = await import('../message.broadcaster');
            await messageBroadcaster.broadcastMessageUpdate(wsMessage);
        }
        logger.info({ userId: user.id, messageId }, 'Message updated via WebSocket');
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling message update');
        socket.emit(WS_EVENTS.ERROR, {
            code: 'MESSAGE_UPDATE_ERROR',
            message: 'Failed to update message',
        });
    }
}
export async function handleMessageDelete(socket, data) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
        const validation = messageDeleteSchema.safeParse(data);
        if (!validation.success) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'INVALID_DATA',
                message: 'Invalid message delete data',
                errors: validation.error.errors,
            });
            return;
        }
        const { messageId } = validation.data;
        const existingMessage = await messageService.getMessage(messageId);
        if (existingMessage.author_id !== user.id) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'Not authorized to delete this message',
            });
            return;
        }
        await messageService.softDeleteMessage(messageId, user.id);
        if (existingMessage.channel_id) {
            const { messageBroadcaster } = await import('../message.broadcaster');
            await messageBroadcaster.broadcastMessageDelete(messageId, existingMessage.channel_id);
        }
        logger.info({ userId: user.id, messageId }, 'Message deleted via WebSocket');
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling message delete');
        socket.emit(WS_EVENTS.ERROR, {
            code: 'MESSAGE_DELETE_ERROR',
            message: 'Failed to delete message',
        });
    }
}
//# sourceMappingURL=message.handler.js.map