import { z } from 'zod';
import { logger } from '../../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { roomManager, RoomType } from '../room.manager';
import { subscriptionManager } from '../subscription.manager';
const roomJoinSchema = z.object({
    roomType: z.enum(['channel', 'server', 'dm']),
    roomId: z.string().min(1),
});
const roomLeaveSchema = z.object({
    roomType: z.enum(['channel', 'server', 'dm']),
    roomId: z.string().min(1),
});
export async function handleRoomJoin(socket, data) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
        const validation = roomJoinSchema.safeParse(data);
        if (!validation.success) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'INVALID_DATA',
                message: 'Invalid room join data',
                errors: validation.error.errors,
            });
            return;
        }
        const { roomType, roomId } = validation.data;
        await roomManager.joinRoom(socket, roomType, roomId);
        if (roomType === 'channel') {
            await subscriptionManager.subscribe(user.id, roomId);
        }
        socket.emit(WS_EVENTS.ROOM_JOINED, {
            roomType,
            roomId,
            timestamp: new Date().toISOString(),
        });
        logger.info({ userId: user.id, roomType, roomId }, 'User joined room');
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling room join');
        socket.emit(WS_EVENTS.ERROR, {
            code: 'ROOM_JOIN_ERROR',
            message: 'Failed to join room',
        });
    }
}
export async function handleRoomLeave(socket, data) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
        const validation = roomLeaveSchema.safeParse(data);
        if (!validation.success) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'INVALID_DATA',
                message: 'Invalid room leave data',
                errors: validation.error.errors,
            });
            return;
        }
        const { roomType, roomId } = validation.data;
        await roomManager.leaveRoom(socket, roomType, roomId);
        if (roomType === 'channel') {
            await subscriptionManager.unsubscribe(user.id, roomId);
        }
        socket.emit(WS_EVENTS.ROOM_LEFT, {
            roomType,
            roomId,
            timestamp: new Date().toISOString(),
        });
        logger.info({ userId: user.id, roomType, roomId }, 'User left room');
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling room leave');
        socket.emit(WS_EVENTS.ERROR, {
            code: 'ROOM_LEAVE_ERROR',
            message: 'Failed to leave room',
        });
    }
}
export async function handleSubscriptionSync(socket) {
    try {
        const user = socket.data.user;
        if (!user) {
            socket.emit(WS_EVENTS.ERROR, {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }
        await subscriptionManager.syncSubscriptions(user.id);
        const subscriptions = await subscriptionManager.getUserSubscriptions(user.id);
        for (const channelId of subscriptions) {
            await roomManager.joinRoom(socket, RoomType.CHANNEL, channelId);
        }
        socket.emit(WS_EVENTS.SUBSCRIPTION_SYNC, {
            channelIds: Array.from(subscriptions),
            timestamp: new Date().toISOString(),
        });
        logger.info({ userId: user.id, channelCount: subscriptions.size }, 'Subscriptions synced');
    }
    catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error handling subscription sync');
        socket.emit(WS_EVENTS.ERROR, {
            code: 'SYNC_ERROR',
            message: 'Failed to sync subscriptions',
        });
    }
}
//# sourceMappingURL=room.handler.js.map