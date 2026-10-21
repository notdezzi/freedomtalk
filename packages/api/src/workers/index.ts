/**
 * Worker process entry point.
 *
 * Runs the background pipeline as a separate process so slow side
 * effects (Meilisearch indexing, link scraping, mention fan-out) never
 * sit on the API request path. Start with:
 *
 *   npm run worker  (from packages/api)
 *
 * Dependencies (Postgres, Redis, RabbitMQ) must be reachable; the
 * worker fails fast on startup if RabbitMQ is not, since it has no
 * purpose without the event stream.
 */

import dotenv from 'dotenv';
dotenv.config();

import { connectRabbitMQ, disconnectRabbitMQ } from '../config/rabbitmq';
import { connectRedis, disconnectRedis } from '../config/redis';
import { db } from '../config/database';
import { logger } from '../config/logger';
import { startSearchIndexWorker } from './search-index.worker';
import { startEmbedWorker } from './embed.worker';
import { startMentionWorker } from './mention.worker';

async function main(): Promise<void> {
  // Fail fast if a dependency is down — better than silently consuming nothing.
  await connectRedis();
  await db.raw('SELECT 1');
  await connectRabbitMQ({ required: true, retries: 10 });

  await Promise.all([startSearchIndexWorker(), startEmbedWorker(), startMentionWorker()]);

  logger.info('All workers started');

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Worker shutting down');
    try {
      await disconnectRabbitMQ();
      await db.destroy();
      await disconnectRedis();
    } catch (error) {
      logger.error({ error }, 'Error during worker shutdown');
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error({ error }, 'Worker failed to start');
  process.exit(1);
});
