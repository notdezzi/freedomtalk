/**
 * Mention notification worker.
 *
 * Consumes `message.created` from `notifications.mentions`, resolves the
 * mentioned users (direct mentions plus @everyone/@here server members),
 * and fans out a `mention:created` event to each mentioned user's
 * personal room through the Socket.io Redis emitter. Runs off the
 * request path so @everyone in a large server costs the sender nothing.
 */

import { consumeEvents, MENTION_QUEUE, DomainEvent } from '../config/rabbitmq';
import { mentionService } from '../services/formatting/mention.service';
import { emitToRoom } from './ws-emitter';
import { logger } from '../config/logger';

export const MENTION_EVENT = 'mention:created';

/** Cap fan-out so an @everyone in a huge server cannot stall the worker */
const MAX_MENTION_FANOUT = 500;

export async function handleMentionEvent(event: DomainEvent): Promise<void> {
  if (event.type !== 'message.created') return;
  const { id, content, authorId, channelId, serverId, createdAt } = event.payload;

  if (!mentionService.parseMentions(content).length) return;

  const mentionedUsers = await mentionService.getMentionedUsers(
    content,
    channelId ?? undefined,
    serverId ?? undefined
  );

  const targets = mentionedUsers.filter((userId) => userId !== authorId);
  if (targets.length === 0) return;

  const payload = { messageId: id, channelId, serverId, authorId, createdAt };
  const fanout = targets.slice(0, MAX_MENTION_FANOUT);

  await Promise.all(fanout.map((userId) => emitToRoom(`user:${userId}`, MENTION_EVENT, payload)));

  logger.debug(
    { messageId: id, mentions: fanout.length },
    'Mention notifications dispatched by worker'
  );
}

export function startMentionWorker(): Promise<void> {
  logger.info({ queue: MENTION_QUEUE }, 'Mention notification worker consuming');
  return consumeEvents(MENTION_QUEUE, handleMentionEvent);
}
