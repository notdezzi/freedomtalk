import { z } from 'zod';
import { logger } from '../../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { presenceManager } from '../presence.manager';
import { statusManager } from '../status.manager';
import { typingManager } from '../typing.manager';
const statusChangeSchema = z.object({
    status: z.enum(['online', 'away', 'busy', 'offline']),
});
const typingStartSchema = z.object({
    channelId: z.string().min(1),
});
const typingStopSchema = z.object({
    channelId: z.string().min(1),
});
export async function handlePresenceUpdate(socket) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
        await presenceManager.refreshPresence(user.id);
        logger.debug({ userId: user.id }, 'Presence updated');
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling presence update');
    }
}
export async function handleStatusChange(socket, data) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
        const validation = statusChangeSchema.safeParse(data);
        if (!validation.success) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'INVALID_DATA',
                message: 'Invalid status change data',
                errors: validation.error.errors,
            });
            return;
        }
        const { status } = validation.data;
        await statusManager.setStatus(user.id, status);
        logger.info({ userId: user.id, status }, 'User status changed');
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling status change');
        socket.emit(WS_EVENTS.ERROR, {
            code: 'STATUS_CHANGE_ERROR',
            message: 'Failed to change status',
        });
    }
}
export async function handleTypingStart(socket, data) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
        const validation = typingStartSchema.safeParse(data);
        if (!validation.success) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'INVALID_DATA',
                message: 'Invalid typing start data',
                errors: validation.error.errors,
            });
            return;
        }
        const { channelId } = validation.data;
        await typingManager.startTyping(user.id, channelId);
        logger.debug({ userId: user.id, channelId }, 'User started typing');
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling typing start');
    }
}
export async function handleTypingStop(socket, data) {
    try {
        const user = socket.data.user;
        if (!user) {
            return;
        }
        const validation = typingStopSchema.safeParse(data);
        if (!validation.success) {
            return;
        }
        const { channelId } = validation.data;
        await typingManager.stopTyping(user.id, channelId);
        logger.debug({ userId: user.id, channelId }, 'User stopped typing');
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling typing stop');
    }
}
//# sourceMappingURL=presence.handler.js.map