import { z } from 'zod';
import { logger } from '../../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { reactionService } from '../../reaction/reaction.service';
import { messageService } from '../../message/message.service';
import { roomManager, RoomType } from '../room.manager';
const reactionAddSchema = z.object({
    messageId: z.string().length(20, 'Invalid message ID'),
    emojiType: z.enum(['unicode', 'custom']),
    emojiId: z.string().length(20).optional(),
    emojiUnicode: z.string().optional(),
});
const reactionRemoveSchema = z.object({
    messageId: z.string().length(20, 'Invalid message ID'),
    emojiType: z.enum(['unicode', 'custom']),
    emojiId: z.string().length(20).optional(),
    emojiUnicode: z.string().optional(),
});
const reactionRemoveAllSchema = z.object({
    messageId: z.string().length(20, 'Invalid message ID'),
});
const reactionRemoveEmojiSchema = z.object({
    messageId: z.string().length(20, 'Invalid message ID'),
    emojiType: z.enum(['unicode', 'custom']),
    emojiId: z.string().length(20).optional(),
    emojiUnicode: z.string().optional(),
});
export async function handleReactionAdd(socket, data) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
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
        const reaction = await reactionService.addReaction(messageId, user.id, emojiType, emojiId, emojiUnicode);
        const message = await messageService.getMessage(messageId);
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
        socket.emit('reaction:ack', {
            reactionId: reaction.id,
            timestamp: new Date().toISOString(),
        });
        logger.info({ userId: user.id, messageId, emojiType }, 'Reaction added via WebSocket');
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling reaction add');
        socket.emit(WS_EVENTS.ERROR, {
            code: 'REACTION_ADD_ERROR',
            message: error.message || 'Failed to add reaction',
        });
    }
}
export async function handleReactionRemove(socket, data) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
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
        await reactionService.removeReaction(messageId, user.id, emojiType, emojiId, emojiUnicode);
        const message = await messageService.getMessage(messageId);
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
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling reaction remove');
        socket.emit(WS_EVENTS.ERROR, {
            code: 'REACTION_REMOVE_ERROR',
            message: error.message || 'Failed to remove reaction',
        });
    }
}
export async function handleReactionRemoveAll(socket, data) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
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
        const message = await messageService.getMessage(messageId);
        const count = await reactionService.removeAllReactions(messageId);
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
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling reaction remove all');
        socket.emit(WS_EVENTS.ERROR, {
            code: 'REACTION_REMOVE_ALL_ERROR',
            message: error.message || 'Failed to remove all reactions',
        });
    }
}
export async function handleReactionRemoveEmoji(socket, data) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
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
        const message = await messageService.getMessage(messageId);
        const count = await reactionService.removeReactionsByEmoji(messageId, emojiType, emojiId, emojiUnicode);
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
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling reaction remove emoji');
        socket.emit(WS_EVENTS.ERROR, {
            code: 'REACTION_REMOVE_EMOJI_ERROR',
            message: error.message || 'Failed to remove reactions by emoji',
        });
    }
}
//# sourceMappingURL=reaction.handler.js.map