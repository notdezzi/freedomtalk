/**
 * Search indexing worker.
 *
 * Consumes message events from `search.messages` and keeps the
 * Meilisearch `messages` index in sync. Runs off the request path:
 * the API only publishes a thin domain event after the message row
 * is committed, and this worker applies it to the search engine.
 */

import { consumeEvents, SEARCH_QUEUE, DomainEvent } from '../config/rabbitmq';
import { messageIndexer } from '../services/search/indexers/message.indexer';
import { logger } from '../config/logger';

async function handleEvent(event: DomainEvent): Promise<void> {
  const p = event.payload;
  switch (event.type) {
    case 'message.created':
      await messageIndexer.indexMessage({
        id: p.id,
        content: p.content,
        authorId: p.authorId,
        channelId: p.channelId,
        serverId: p.serverId,
        createdAt: new Date(p.createdAt),
      });
      break;
    case 'message.updated':
      await messageIndexer.updateMessage({
        id: p.id,
        content: p.content,
        authorId: p.authorId,
        channelId: p.channelId,
        serverId: p.serverId,
        createdAt: new Date(p.createdAt),
      });
      break;
    case 'message.deleted':
      await messageIndexer.deleteMessage(p.id);
      break;
  }
}

export function startSearchIndexWorker(): Promise<void> {
  logger.info({ queue: SEARCH_QUEUE }, 'Search indexing worker consuming');
  return consumeEvents(SEARCH_QUEUE, async (event) => {
    await handleEvent(event);
    logger.debug({ type: event.type, id: event.payload.id }, 'Message indexed');
  });
}
