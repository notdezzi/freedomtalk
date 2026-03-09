import { Socket } from 'socket.io';
import { z } from 'zod';
import { logger } from '../../../config/logger';
import { WS_EVENTS, VALIDATION, PERMISSION_FLAGS } from '@freedomtalk/shared';
import { messageService } from '../../message/message.service';
import { messageRouter } from '../message.router';
import { dmChannelService } from '../../dm/dm-channel.service';
import { permissionService } from '../../permission';

/**
 * Message create data schema
 */
const messageCreateSchema = z.object({
  content: z.string().min(1).max(2000),
  channelId: z.string().min(1).optional(),
  dmChannelId: z.string().min(1).optional(),
  embeds: z.array(z.any()).max(VALIDATION.EMBED.MAX_PER_MESSAGE).optional(),
}).refine(data => data.channelId || data.dmChannelId, {
  message: 'Either channelId or dmChannelId is required',
});

/**
 * Message update data schema
 */
const messageUpdateSchema = z.object({
  messageId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

/**
 * Message delete data schema
 */
const messageDeleteSchema = z.object({
  messageId: z.string().min(1),
});

/**
 * Handle message create event
 * @param socket - Socket instance
 * @param data - Message create data
 */
export async function handleMessageCreate(socket: Socket, data: unknown): Promise<void> {
  try {
    const user = socket.data.user;
    
    if (!user) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
      return;
    }

    // Validate data
    const validation = messageCreateSchema.safeParse(data);
    if (!validation.success) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'INVALID_DATA',
        message: 'Invalid message data',
        errors: validation.error.errors,
      });
      return;
    }

    const { content, channelId, dmChannelId, embeds } = validation.data;

    // Authorization check for channel messages
    if (channelId) {
      const hasPermission = await permissionService.hasChannelPermission(user.id, channelId, PERMISSION_FLAGS.SEND_MESSAGES);
      if (!hasPermission) {
        socket.emit(WS_EVENTS.ERROR, {
          code: 'FORBIDDEN',
          message: 'You do not have permission to send messages in this channel',
        });
        return;
      }
    }

    // Authorization check for DM messages
    if (dmChannelId) {
      const isParticipant = await dmChannelService.isParticipant(dmChannelId, user.id);
      if (!isParticipant) {
        socket.emit(WS_EVENTS.ERROR, {
          code: 'FORBIDDEN',
          message: 'You are not a participant of this DM channel',
        });
        return;
      }
    }

    // Create message
    // Note: We don't check subscription here because messages are broadcast
    // to the channel room, and room membership provides sufficient access control
    const message = await messageService.createMessage({
      content,
      authorId: user.id,
      channelId,
      dmChannelId,
      embeds,
    });

    // Convert message to WebSocket format (camelCase) with author info
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
        id: user.id,
        username: user.username,
      },
      embeds: message.embeds?.map(embed => ({
        ...embed,
        timestamp: embed.timestamp instanceof Date ? embed.timestamp.toISOString() : embed.timestamp,
      })),
    };

    // Route message to subscribers
    await messageRouter.routeMessage(wsMessage);

    // Send acknowledgment to sender
    socket.emit('message:ack', {
      messageId: message.id,
      timestamp: new Date().toISOString(),
    });

    logger.info({ userId: user.id, messageId: message.id, channelId: channelId || dmChannelId }, 'Message created via WebSocket');
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling message create');
    socket.emit(WS_EVENTS.ERROR, {
      code: 'MESSAGE_CREATE_ERROR',
      message: 'Failed to create message',
    });
  }
}

/**
 * Handle message update event
 * @param socket - Socket instance
 * @param data - Message update data
 */
export async function handleMessageUpdate(socket: Socket, data: unknown): Promise<void> {
  try {
    const user = socket.data.user;
    
    if (!user) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
      return;
    }

    // Validate data
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

    // Get existing message to validate ownership
    const existingMessage = await messageService.getMessage(messageId);
    
    if (existingMessage.author_id !== user.id) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'UNAUTHORIZED',
        message: 'Not authorized to edit this message',
      });
      return;
    }

    // Update message
    const updatedMessage = await messageService.updateMessage(messageId, content, user.id);

    // Convert to WebSocket format
    const wsMessage = {
      id: updatedMessage.id,
      content: updatedMessage.content,
      authorId: updatedMessage.author_id,
      channelId: updatedMessage.channel_id,
      dmChannelId: updatedMessage.dm_channel_id,
      createdAt: updatedMessage.created_at.toISOString(),
      updatedAt: updatedMessage.updated_at.toISOString(),
      isEdited: updatedMessage.is_edited,
      isDeleted: updatedMessage.is_deleted,
    };

    // Broadcast update to channel or DM participants
    if (updatedMessage.channel_id) {
      const { messageBroadcaster } = await import('../message.broadcaster');
      await messageBroadcaster.broadcastMessageUpdate(wsMessage);
    } else if (updatedMessage.dm_channel_id) {
      // For DM messages, route through the DM router
      await messageRouter.routeMessage(wsMessage as any);
    }

    logger.info({ userId: user.id, messageId }, 'Message updated via WebSocket');
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling message update');
    socket.emit(WS_EVENTS.ERROR, {
      code: 'MESSAGE_UPDATE_ERROR',
      message: 'Failed to update message',
    });
  }
}

/**
 * Handle message delete event
 * @param socket - Socket instance
 * @param data - Message delete data
 */
export async function handleMessageDelete(socket: Socket, data: unknown): Promise<void> {
  try {
    const user = socket.data.user;
    
    if (!user) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
      return;
    }

    // Validate data
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

    // Get existing message to validate ownership
    const existingMessage = await messageService.getMessage(messageId);
    
    if (existingMessage.author_id !== user.id) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'UNAUTHORIZED',
        message: 'Not authorized to delete this message',
      });
      return;
    }

    // Soft delete message
    await messageService.softDeleteMessage(messageId, user.id);

    // Broadcast deletion to channel or DM participants
    if (existingMessage.channel_id) {
      const { messageBroadcaster } = await import('../message.broadcaster');
      await messageBroadcaster.broadcastMessageDelete(messageId, existingMessage.channel_id);
    } else if (existingMessage.dm_channel_id) {
      // For DM messages, broadcast to DM participants
      const { messageBroadcaster } = await import('../message.broadcaster');
      const participantIds = await dmChannelService.getParticipantUserIds(existingMessage.dm_channel_id);
      for (const participantId of participantIds) {
        await messageBroadcaster.broadcastToUser(participantId, 'message:deleted', {
          messageId,
          dmChannelId: existingMessage.dm_channel_id,
        });
      }
    }

    logger.info({ userId: user.id, messageId }, 'Message deleted via WebSocket');
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling message delete');
    socket.emit(WS_EVENTS.ERROR, {
      code: 'MESSAGE_DELETE_ERROR',
      message: 'Failed to delete message',
    });
  }
}

