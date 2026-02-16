/**
 * DM Channel WebSocket Handler
 * Handles DM channel-related WebSocket events
 */

import { Socket } from 'socket.io';
import { z } from 'zod';
import { logger } from '../../../config/logger';
import { dmChannelService, UpdateGroupDMRequest } from '../../dm/dm-channel.service';
import { toDMChannelResponse } from '../../dm/dm-channel.types';
import { wsServer } from '../websocket.server';

/**
 * Validation schemas
 */
const createDMSchema = z.object({
  recipient_id: z.string().length(20).optional(),
  recipients: z.array(z.string().length(20)).min(1).max(9).optional(),
  name: z.string().min(1).max(100).optional(),
  icon_url: z.string().url().max(500).optional(),
}).refine(
  (data) => data.recipient_id || (data.recipients && data.recipients.length > 0),
  { message: 'Either recipient_id or recipients must be provided' }
);

const updateGroupDMSchema = z.object({
  dm_channel_id: z.string().length(20),
  name: z.string().min(1).max(100).optional(),
  icon_url: z.string().url().max(500).nullable().optional(),
});

const addParticipantSchema = z.object({
  dm_channel_id: z.string().length(20),
  user_id: z.string().length(20),
});

const removeParticipantSchema = z.object({
  dm_channel_id: z.string().length(20),
  user_id: z.string().length(20),
});

const deleteDMSchema = z.object({
  dm_channel_id: z.string().length(20),
});

/**
 * DM Channel event names
 */
const DM_EVENTS = {
  CREATE: 'dm_channel:create',
  UPDATE: 'dm_channel:update',
  DELETE: 'dm_channel:delete',
  RECIPIENT_ADD: 'dm_channel:recipient_add',
  RECIPIENT_REMOVE: 'dm_channel:recipient_remove',
  ERROR: 'dm_channel:error',
} as const;

/**
 * Get room name for a DM channel
 */
function getDMRoomName(dmChannelId: string): string {
  return `dm:${dmChannelId}`;
}

/**
 * Broadcast to all participants of a DM channel
 */
async function broadcastToDMParticipants(
  dmChannelId: string,
  event: string,
  data: any
): Promise<void> {
  const io = wsServer.getIO();
  const roomName = getDMRoomName(dmChannelId);
  io.to(roomName).emit(event, data);
  logger.debug({ dmChannelId, event, room: roomName }, 'Broadcast to DM room');
}

/**
 * Handle DM channel creation
 */
async function handleDMChannelCreate(socket: Socket, data: unknown): Promise<void> {
  const userId = socket.data.userId;
  if (!userId) {
    socket.emit(DM_EVENTS.ERROR, { error: 'Not authenticated' });
    return;
  }

  try {
    const parsed = createDMSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit(DM_EVENTS.ERROR, { error: 'Invalid data', details: parsed.error.errors });
      return;
    }

    const body = parsed.data;
    let dmChannel;

    // Single DM
    if (body.recipient_id && !body.recipients) {
      dmChannel = await dmChannelService.createDM(userId, body.recipient_id);
    }
    // Group DM
    else if (body.recipients && body.recipients.length > 0) {
      dmChannel = await dmChannelService.createGroupDM(
        userId,
        body.recipients,
        body.name,
        body.icon_url
      );
    } else {
      socket.emit(DM_EVENTS.ERROR, { error: 'Invalid request' });
      return;
    }

    const response = toDMChannelResponse(dmChannel, dmChannel.participants);

    // Join socket to DM room
    const roomName = getDMRoomName(dmChannel.id);
    socket.join(roomName);

    // Broadcast creation to all participants
    await broadcastToDMParticipants(dmChannel.id, DM_EVENTS.CREATE, response);

    logger.info({ dmChannelId: dmChannel.id, userId, type: dmChannel.type }, 'DM channel created via WebSocket');
  } catch (error: any) {
    logger.error({ error, userId }, 'Error creating DM channel');
    socket.emit(DM_EVENTS.ERROR, { error: error.message || 'Failed to create DM channel' });
  }
}

/**
 * Handle DM channel update
 */
async function handleDMChannelUpdate(socket: Socket, data: unknown): Promise<void> {
  const userId = socket.data.userId;
  if (!userId) {
    socket.emit(DM_EVENTS.ERROR, { error: 'Not authenticated' });
    return;
  }

  try {
    const parsed = updateGroupDMSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit(DM_EVENTS.ERROR, { error: 'Invalid data', details: parsed.error.errors });
      return;
    }

    const { dm_channel_id, name, icon_url } = parsed.data;

    const updates: UpdateGroupDMRequest = {
      name,
      iconUrl: icon_url ?? undefined,
    };

    const dmChannel = await dmChannelService.updateGroupDM(dm_channel_id, updates, userId);
    const response = toDMChannelResponse(dmChannel, dmChannel.participants);

    // Broadcast update to all participants
    await broadcastToDMParticipants(dm_channel_id, DM_EVENTS.UPDATE, response);

    logger.info({ dmChannelId: dm_channel_id, userId }, 'DM channel updated via WebSocket');
  } catch (error: any) {
    logger.error({ error, userId }, 'Error updating DM channel');
    socket.emit(DM_EVENTS.ERROR, { error: error.message || 'Failed to update DM channel' });
  }
}

/**
 * Handle DM channel delete (leave)
 */
async function handleDMChannelDelete(socket: Socket, data: unknown): Promise<void> {
  const userId = socket.data.userId;
  if (!userId) {
    socket.emit(DM_EVENTS.ERROR, { error: 'Not authenticated' });
    return;
  }

  try {
    const parsed = deleteDMSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit(DM_EVENTS.ERROR, { error: 'Invalid data', details: parsed.error.errors });
      return;
    }

    const { dm_channel_id } = parsed.data;

    // Leave the DM room
    const roomName = getDMRoomName(dm_channel_id);
    socket.leave(roomName);

    await dmChannelService.deleteDM(dm_channel_id, userId);

    // Notify the leaving user
    socket.emit(DM_EVENTS.DELETE, { dm_channel_id, left_by: userId });

    // Notify remaining participants
    await broadcastToDMParticipants(dm_channel_id, DM_EVENTS.RECIPIENT_REMOVE, {
      dm_channel_id,
      user_id: userId,
      left_at: new Date().toISOString(),
    });

    logger.info({ dmChannelId: dm_channel_id, userId }, 'User left DM channel via WebSocket');
  } catch (error: any) {
    logger.error({ error, userId }, 'Error deleting DM channel');
    socket.emit(DM_EVENTS.ERROR, { error: error.message || 'Failed to leave DM channel' });
  }
}

/**
 * Handle adding a participant to group DM
 */
async function handleRecipientAdd(socket: Socket, data: unknown): Promise<void> {
  const userId = socket.data.userId;
  if (!userId) {
    socket.emit(DM_EVENTS.ERROR, { error: 'Not authenticated' });
    return;
  }

  try {
    const parsed = addParticipantSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit(DM_EVENTS.ERROR, { error: 'Invalid data', details: parsed.error.errors });
      return;
    }

    const { dm_channel_id, user_id: newUserId } = parsed.data;

    const dmChannel = await dmChannelService.addParticipant(dm_channel_id, newUserId, userId);
    const response = toDMChannelResponse(dmChannel, dmChannel.participants);

    // Broadcast to all participants including the new one
    await broadcastToDMParticipants(dm_channel_id, DM_EVENTS.RECIPIENT_ADD, {
      dm_channel: response,
      added_user_id: newUserId,
      added_by: userId,
      joined_at: new Date().toISOString(),
    });

    logger.info({ dmChannelId: dm_channel_id, newUserId, addedBy: userId }, 'Participant added to DM via WebSocket');
  } catch (error: any) {
    logger.error({ error, userId }, 'Error adding participant');
    socket.emit(DM_EVENTS.ERROR, { error: error.message || 'Failed to add participant' });
  }
}

/**
 * Handle removing a participant from group DM
 */
async function handleRecipientRemove(socket: Socket, data: unknown): Promise<void> {
  const userId = socket.data.userId;
  if (!userId) {
    socket.emit(DM_EVENTS.ERROR, { error: 'Not authenticated' });
    return;
  }

  try {
    const parsed = removeParticipantSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit(DM_EVENTS.ERROR, { error: 'Invalid data', details: parsed.error.errors });
      return;
    }

    const { dm_channel_id, user_id: removedUserId } = parsed.data;

    const dmChannel = await dmChannelService.removeParticipant(dm_channel_id, removedUserId, userId);
    const response = toDMChannelResponse(dmChannel, dmChannel.participants);

    // Broadcast to all participants (the removed user won't receive this if they're disconnected)
    await broadcastToDMParticipants(dm_channel_id, DM_EVENTS.RECIPIENT_REMOVE, {
      dm_channel: response,
      removed_user_id: removedUserId,
      removed_by: userId,
      left_at: new Date().toISOString(),
    });

    logger.info({ dmChannelId: dm_channel_id, removedUserId, removedBy: userId }, 'Participant removed from DM via WebSocket');
  } catch (error: any) {
    logger.error({ error, userId }, 'Error removing participant');
    socket.emit(DM_EVENTS.ERROR, { error: error.message || 'Failed to remove participant' });
  }
}

/**
 * Register DM channel event handlers
 */
export function registerDMChannelHandlers(socket: Socket): void {
  socket.on(DM_EVENTS.CREATE, (data) => handleDMChannelCreate(socket, data));
  socket.on(DM_EVENTS.UPDATE, (data) => handleDMChannelUpdate(socket, data));
  socket.on(DM_EVENTS.DELETE, (data) => handleDMChannelDelete(socket, data));
  socket.on(DM_EVENTS.RECIPIENT_ADD, (data) => handleRecipientAdd(socket, data));
  socket.on(DM_EVENTS.RECIPIENT_REMOVE, (data) => handleRecipientRemove(socket, data));

  logger.debug({ socketId: socket.id }, 'DM channel handlers registered');
}

export default {
  registerDMChannelHandlers,
  DM_EVENTS,
};
