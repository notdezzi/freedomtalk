/**
 * Message access control
 *
 * Shared authorization helpers for any route that reads or touches an
 * existing message (single-message reads, edit history, reactions,
 * attachments, pins). Server messages require channel view/history
 * permissions; DM messages require participation. Access failures return
 * 404 so the existence of messages in inaccessible channels/DMs is not
 * revealed.
 */

import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { permissionService } from '../permission';
import { dmChannelService } from '../dm/dm-channel.service';
import { PERMISSION_FLAGS } from '@freedomtalk/shared';

export interface MessageScope {
  channel_id: string | null;
  dm_channel_id: string | null;
  author_id: string;
}

export class ForbiddenMessageAccessError extends AppError {
  constructor(message = 'Message not found') {
    super(404, 'MESSAGE_NOT_FOUND', message);
  }
}

/**
 * Assert the user may read the message (and see its metadata/reactions).
 * Throws ForbiddenMessageAccessError (404) when access is denied.
 */
export async function assertMessageReadAccess(
  userId: string,
  message: MessageScope
): Promise<void> {
  if (message.dm_channel_id) {
    const isParticipant = await dmChannelService.isParticipant(
      message.dm_channel_id,
      userId
    );
    if (!isParticipant) {
      throw new ForbiddenMessageAccessError();
    }
    return;
  }

  if (message.channel_id) {
    const channel = await db('channels')
      .where('id', message.channel_id)
      .select('server_id')
      .first();

    // Orphaned channel (e.g. server deleted): treat as gone.
    if (!channel) {
      throw new ForbiddenMessageAccessError();
    }

    const canView = await permissionService.hasChannelPermission(
      userId,
      message.channel_id,
      PERMISSION_FLAGS.VIEW_CHANNEL
    );
    if (!canView) {
      throw new ForbiddenMessageAccessError();
    }
    const canReadHistory = await permissionService.hasChannelPermission(
      userId,
      message.channel_id,
      PERMISSION_FLAGS.READ_MESSAGE_HISTORY
    );
    if (!canReadHistory) {
      throw new ForbiddenMessageAccessError();
    }
    return;
  }

  // Neither channel nor DM scope (should not happen): fail closed.
  throw new ForbiddenMessageAccessError();
}

/**
 * Assert the user may edit the message: authors can always edit; for server
 * messages moderators with MANAGE_MESSAGES may edit others' messages. DM
 * messages can only be edited by their author.
 * Throws 404 for inaccessible messages, 403 for accessible-but-not-allowed.
 */
export async function assertMessageEditAccess(
  userId: string,
  message: MessageScope
): Promise<void> {
  if (message.author_id === userId) {
    return;
  }

  if (!message.channel_id) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You can only edit your own messages'
    );
  }

  const channel = await db('channels')
    .where('id', message.channel_id)
    .select('server_id')
    .first();

  if (!channel) {
    throw new ForbiddenMessageAccessError();
  }

  const canManage = await permissionService.hasChannelPermission(
    userId,
    message.channel_id,
    PERMISSION_FLAGS.MANAGE_MESSAGES
  );
  if (!canManage) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You do not have permission to edit this message'
    );
  }
}
