import { Socket } from 'socket.io';
import { z } from 'zod';
import { logger } from '../../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { roomManager, RoomType } from '../room.manager';
import { subscriptionManager } from '../subscription.manager';

/**
 * Room join data schema
 */
const roomJoinSchema = z.object({
  roomType: z.enum(['channel', 'server', 'dm']),
  roomId: z.string().min(1),
});

/**
 * Room leave data schema
 */
const roomLeaveSchema = z.object({
  roomType: z.enum(['channel', 'server', 'dm']),
  roomId: z.string().min(1),
});

/**
 * Handle room join event
 * @param socket - Socket instance
 * @param data - Room join data
 */
export async function handleRoomJoin(socket: Socket, data: unknown): Promise<void> {
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

    // TODO: Add permission validation when server/channel tables are implemented
    // For now, allow all joins

    // Join room
    await roomManager.joinRoom(socket, roomType as RoomType, roomId);

    // Subscribe to channel if it's a channel room
    if (roomType === 'channel') {
      await subscriptionManager.subscribe(user.id, roomId);
    }

    // Emit success event
    socket.emit(WS_EVENTS.ROOM_JOINED, {
      roomType,
      roomId,
      timestamp: new Date().toISOString(),
    });

    logger.info({ userId: user.id, roomType, roomId }, 'User joined room');
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling room join');
    socket.emit(WS_EVENTS.ERROR, {
      code: 'ROOM_JOIN_ERROR',
      message: 'Failed to join room',
    });
  }
}

/**
 * Handle room leave event
 * @param socket - Socket instance
 * @param data - Room leave data
 */
export async function handleRoomLeave(socket: Socket, data: unknown): Promise<void> {
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

    // Leave room
    await roomManager.leaveRoom(socket, roomType as RoomType, roomId);

    // Unsubscribe from channel if it's a channel room
    if (roomType === 'channel') {
      await subscriptionManager.unsubscribe(user.id, roomId);
    }

    // Emit success event
    socket.emit(WS_EVENTS.ROOM_LEFT, {
      roomType,
      roomId,
      timestamp: new Date().toISOString(),
    });

    logger.info({ userId: user.id, roomType, roomId }, 'User left room');
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling room leave');
    socket.emit(WS_EVENTS.ERROR, {
      code: 'ROOM_LEAVE_ERROR',
      message: 'Failed to leave room',
    });
  }
}

/**
 * Handle subscription sync event
 * @param socket - Socket instance
 */
export async function handleSubscriptionSync(socket: Socket): Promise<void> {
  try {
    const user = socket.data.user;
    
    if (!user) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
      return;
    }

    // Sync subscriptions from database
    await subscriptionManager.syncSubscriptions(user.id);

    // Get all subscribed channels
    const subscriptions = await subscriptionManager.getUserSubscriptions(user.id);

    // Join all channel rooms
    for (const channelId of subscriptions) {
      await roomManager.joinRoom(socket, RoomType.CHANNEL, channelId);
    }

    // Emit success event
    socket.emit(WS_EVENTS.SUBSCRIPTION_SYNC, {
      channelIds: Array.from(subscriptions),
      timestamp: new Date().toISOString(),
    });

    logger.info({ userId: user.id, channelCount: subscriptions.size }, 'Subscriptions synced');
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling subscription sync');
    socket.emit(WS_EVENTS.ERROR, {
      code: 'SYNC_ERROR',
      message: 'Failed to sync subscriptions',
    });
  }
}

