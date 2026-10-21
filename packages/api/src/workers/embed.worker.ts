/**
 * Link-embed worker.
 *
 * Consumes `message.created` from `embeds.generate`, scrapes Open Graph
 * metadata for the first URL in the message (Discord behavior), persists
 * the embed, and notifies connected clients via the Socket.io Redis
 * emitter so the embed appears without a refetch.
 */

import { consumeEvents, EMBED_QUEUE, DomainEvent } from '../config/rabbitmq';
import { linkPreviewService } from '../services/embed/link-preview.service';
import { embedService } from '../services/embed/embed.service';
import { emitToRoom } from './ws-emitter';
import { WS_EVENTS } from '@freedomtalk/shared';
import { db } from '../config/database';
import { logger } from '../config/logger';

export async function handleEmbedEvent(event: DomainEvent): Promise<void> {
  if (event.type !== 'message.created') return;
  const { id, channelId } = event.payload;

  const urls = linkPreviewService.extractUrls(event.payload.content);
  if (urls.length === 0) return;

  // Generate preview for first URL only (Discord behavior)
  const embed = await linkPreviewService.generatePreview(urls[0]!);
  if (!embed) return;

  await embedService.createEmbed(id, embed);
  logger.info({ messageId: id, url: urls[0] }, 'Link preview persisted by embed worker');

  if (!channelId) return;

  const message = await db('messages').where({ id }).first();
  if (!message) return;

  await emitToRoom(`channel:${channelId}`, WS_EVENTS.MESSAGE_UPDATED, {
    id: message.id,
    content: message.content,
    authorId: message.author_id,
    channelId: message.channel_id,
    createdAt: message.created_at.toISOString(),
    updatedAt: message.updated_at.toISOString(),
    isEdited: message.is_edited,
    isDeleted: message.is_deleted,
    embeds: [
      {
        ...embed,
        timestamp:
          embed.timestamp instanceof Date ? embed.timestamp.toISOString() : embed.timestamp,
      },
    ],
  });
}

export function startEmbedWorker(): Promise<void> {
  logger.info({ queue: EMBED_QUEUE }, 'Link embed worker consuming');
  return consumeEvents(EMBED_QUEUE, handleEmbedEvent);
}
