import { Socket } from 'socket.io';
import { z } from 'zod';
import { logger } from '../../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { reactionService } from '../../reaction/reaction.service';
import { messageService } from '../../message/message.service';
import { roomManager, RoomType } from '../room.manager';

/**
 * Reaction add data schema
 */
const reactionAddSchema = z.object({
  messageId: z.string().length(20, 'Invalid message ID'),
  emojiType: z.enum(['unicode', 'custom']),
  emojiId: z.string().length(20).optional(),
  emojiUnicode: z.string().optional(),
});

/**
 * Reaction remove data schema
 */
const reactionRemoveSchema = z.object({
  messageId: z.string().length(20, 'Invalid message ID'),
  emojiType: z.enum(['unicode', 'custom']),
  emojiId: z.string().length(20).optional(),
  emojiUnicode: z.string().optional(),
});

/**
 * Reaction remove all data schema
 */
const reactionRemoveAllSchema = z.object({
  messageId: z.string().length(20, 'Invalid message ID'),
});

/**
 * Reaction remove emoji data schema
 */
const reactionRemoveEmojiSchema = z.object({
  messageId: z.string().length(20, 'Invalid message ID'),
  emojiType: z.enum(['unicode', 'custom']),
  emojiId: z.string().length(20).optional(),
  emojiUnicode: z.string().optional(),
});

/**
 * Handle reaction add event
 * @param socket - Socket instance
 * @param data - Reaction add data
 */
export async function handleReactionAdd(socket: Socket, data: unknown): Promise<void> {
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
    const validation = reactionAddSchema.safeParse(data);
    if (!validation.success) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'INVALID_DATA',
        message: 'Invalid reaction data',
        errors: validation.error.errors,
      });
      return;
    }

    const { messageId, emojiType, emojiId, emojiUnicode } = validation.data;

    // Validate emoji parameters
    if (emojiType === 'custom' && !emojiId) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'INVALID_DATA',
        message: 'emoji_id is required for custom emojis',
      });
      return;
    }
    if (emojiType === 'unicode' && !emojiUnicode) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'INVALID_DATA',
        message: 'emoji_unicode is required for unicode emojis',
      });
      return;
    }

    // Add reaction
    const reaction = await reactionService.addReaction(
      messageId,
      user.id,
      emojiType,
      emojiId,
      emojiUnicode
    );

    // Get message to determine channel for broadcasting
    const message = await messageService.getMessage(messageId);

    // Broadcast reaction add event to channel
    if (message.channel_id) {
      const roomName = roomManager.getRoomName(RoomType.CHANNEL, message.channel_id);
      roomManager.broadcastToRoom(roomName, WS_EVENTS.REACTION_ADD, {
        messageId,
        userId: user.id,
        emojiType,
        emojiId: emojiId || null,
        emojiUnicode: emojiUnicode || null,
        reactionId: reaction.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Send acknowledgment to sender
    socket.emit('reaction:ack', {
      reactionId: reaction.id,
      timestamp: new Date().toISOString(),
    });

    logger.info({ userId: user.id, messageId, emojiType }, 'Reaction added via WebSocket');
  } catch (error: any) {
    logger.error({ error, socketId: socket.id }, 'Error handling reaction add');
    socket.emit(WS_EVENTS.ERROR, {
      code: 'REACTION_ADD_ERROR',
      message: error.message || 'Failed to add reaction',
    });
  }
}

/**
 * Handle reaction remove event
 * @param socket - Socket instance
 * @param data - Reaction remove data
 */
export async function handleReactionRemove(socket: Socket, data: unknown): Promise<void> {
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
    const validation = reactionRemoveSchema.safeParse(data);
    if (!validation.success) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'INVALID_DATA',
        message: 'Invalid reaction remove data',
        errors: validation.error.errors,
      });
      return;
    }

    const { messageId, emojiType, emojiId, emojiUnicode } = validation.data;

    // Remove reaction
    await reactionService.removeReaction(
      messageId,
      user.id,
      emojiType,
      emojiId,
      emojiUnicode
    );

    // Get message to determine channel for broadcasting
    const message = await messageService.getMessage(messageId);

    // Broadcast reaction remove event to channel
    if (message.channel_id) {
      const roomName = roomManager.getRoomName(RoomType.CHANNEL, message.channel_id);
      roomManager.broadcastToRoom(roomName, WS_EVENTS.REACTION_REMOVE, {
        messageId,
        userId: user.id,
        emojiType,
        emojiId: emojiId || null,
        emojiUnicode: emojiUnicode || null,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info({ userId: user.id, messageId, emojiType }, 'Reaction removed via WebSocket');
  } catch (error: any) {
    logger.error({ error, socketId: socket.id }, 'Error handling reaction remove');
    socket.emit(WS_EVENTS.ERROR, {
      code: 'REACTION_REMOVE_ERROR',
      message: error.message || 'Failed to remove reaction',
    });
  }
}

/**
 * Handle reaction remove all event
 * @param socket - Socket instance
 * @param data - Reaction remove all data
 */
export async function handleReactionRemoveAll(socket: Socket, data: unknown): Promise<void> {
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
    const validation = reactionRemoveAllSchema.safeParse(data);
    if (!validation.success) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'INVALID_DATA',
        message: 'Invalid reaction remove all data',
        errors: validation.error.errors,
      });
      return;
    }

    const { messageId } = validation.data;

    // Get message to check ownership/permissions
    const message = await messageService.getMessage(messageId);

    // TODO: Add permission check (message author or admin)
    // For now, we'll allow any authenticated user (will be fixed in permission system)

    // Remove all reactions
    const count = await reactionService.removeAllReactions(messageId);

    // Broadcast reaction remove all event to channel
    if (message.channel_id) {
      const roomName = roomManager.getRoomName(RoomType.CHANNEL, message.channel_id);
      roomManager.broadcastToRoom(roomName, WS_EVENTS.REACTION_REMOVE_ALL, {
        messageId,
        userId: user.id,
        count,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info({ userId: user.id, messageId, count }, 'All reactions removed via WebSocket');
  } catch (error: any) {
    logger.error({ error, socketId: socket.id }, 'Error handling reaction remove all');
    socket.emit(WS_EVENTS.ERROR, {
      code: 'REACTION_REMOVE_ALL_ERROR',
      message: error.message || 'Failed to remove all reactions',
    });
  }
}

/**
 * Handle reaction remove emoji event
 * @param socket - Socket instance
 * @param data - Reaction remove emoji data
 */
export async function handleReactionRemoveEmoji(socket: Socket, data: unknown): Promise<void> {
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
    const validation = reactionRemoveEmojiSchema.safeParse(data);
    if (!validation.success) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'INVALID_DATA',
        message: 'Invalid reaction remove emoji data',
        errors: validation.error.errors,
      });
      return;
    }

    const { messageId, emojiType, emojiId, emojiUnicode } = validation.data;

    // Get message to check ownership/permissions
    const message = await messageService.getMessage(messageId);

    // TODO: Add permission check (message author or admin)
    // For now, we'll allow any authenticated user (will be fixed in permission system)

    // Remove reactions by emoji
    const count = await reactionService.removeReactionsByEmoji(
      messageId,
      emojiType,
      emojiId,
      emojiUnicode
    );

    // Broadcast reaction remove emoji event to channel
    if (message.channel_id) {
      const roomName = roomManager.getRoomName(RoomType.CHANNEL, message.channel_id);
      roomManager.broadcastToRoom(roomName, WS_EVENTS.REACTION_REMOVE_EMOJI, {
        messageId,
        userId: user.id,
        emojiType,
        emojiId: emojiId || null,
        emojiUnicode: emojiUnicode || null,
        count,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info({ userId: user.id, messageId, emojiType, count }, 'Reactions removed by emoji via WebSocket');
  } catch (error: any) {
    logger.error({ error, socketId: socket.id }, 'Error handling reaction remove emoji');
    socket.emit(WS_EVENTS.ERROR, {
      code: 'REACTION_REMOVE_EMOJI_ERROR',
      message: error.message || 'Failed to remove reactions by emoji',
    });
  }
}


