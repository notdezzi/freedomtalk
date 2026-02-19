import { Socket } from 'socket.io';
import { z } from 'zod';
import { logger } from '../../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { presenceManager } from '../presence.manager';
import { statusManager, UserStatus } from '../status.manager';
import { typingManager } from '../typing.manager';

/**
 * Status change data schema
 */
const statusChangeSchema = z.object({
  status: z.enum(['online', 'away', 'busy', 'offline']),
});

/**
 * Typing start data schema
 */
const typingStartSchema = z.object({
  channelId: z.string().optional(),
  dmChannelId: z.string().optional(),
}).refine(data => data.channelId || data.dmChannelId, {
  message: 'Either channelId or dmChannelId is required',
});

/**
 * Typing stop data schema
 */
const typingStopSchema = z.object({
  channelId: z.string().optional(),
  dmChannelId: z.string().optional(),
}).refine(data => data.channelId || data.dmChannelId, {
  message: 'Either channelId or dmChannelId is required',
});

/**
 * Handle presence update event
 * @param socket - Socket instance
 */
export async function handlePresenceUpdate(socket: Socket): Promise<void> {
  try {
    const user = socket.data.user;
    
    if (!user) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
      return;
    }

    // Refresh presence
    await presenceManager.refreshPresence(user.id);

    logger.debug({ userId: user.id }, 'Presence updated');
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling presence update');
  }
}

/**
 * Handle status change event
 * @param socket - Socket instance
 * @param data - Status change data
 */
export async function handleStatusChange(socket: Socket, data: unknown): Promise<void> {
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

    // Set status
    await statusManager.setStatus(user.id, status as UserStatus);

    logger.info({ userId: user.id, status }, 'User status changed');
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling status change');
    socket.emit(WS_EVENTS.ERROR, {
      code: 'STATUS_CHANGE_ERROR',
      message: 'Failed to change status',
    });
  }
}

/**
 * Handle typing start event
 * @param socket - Socket instance
 * @param data - Typing start data
 */
export async function handleTypingStart(socket: Socket, data: unknown): Promise<void> {
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
    const validation = typingStartSchema.safeParse(data);
    if (!validation.success) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'INVALID_DATA',
        message: 'Invalid typing start data',
        errors: validation.error.errors,
      });
      return;
    }

    const { channelId, dmChannelId } = validation.data;
    const effectiveChannelId = channelId || dmChannelId!;
    const channelType = dmChannelId ? 'dm' : 'channel';

    // Start typing indicator
    // Note: We don't check subscription here because typing indicators are broadcast
    // to the channel room, and room membership provides sufficient access control
    await typingManager.startTyping(user.id, effectiveChannelId, channelType);

    logger.debug({ userId: user.id, channelId: effectiveChannelId, channelType }, 'User started typing');
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling typing start');
  }
}

/**
 * Handle typing stop event
 * @param socket - Socket instance
 * @param data - Typing stop data
 */
export async function handleTypingStop(socket: Socket, data: unknown): Promise<void> {
  try {
    const user = socket.data.user;

    if (!user) {
      return;
    }

    // Validate data
    const validation = typingStopSchema.safeParse(data);
    if (!validation.success) {
      return;
    }

    const { channelId, dmChannelId } = validation.data;
    const effectiveChannelId = channelId || dmChannelId!;
    const channelType = dmChannelId ? 'dm' : 'channel';

    // Stop typing indicator
    await typingManager.stopTyping(user.id, effectiveChannelId, channelType);

    logger.debug({ userId: user.id, channelId: effectiveChannelId, channelType }, 'User stopped typing');
  } catch (error) {
    logger.error({ error, socketId: socket.id }, 'Error handling typing stop');
  }
}

