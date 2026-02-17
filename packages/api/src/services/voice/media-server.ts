/**
 * Media Server Entry Point
 * Runs as a separate process to handle WebRTC media via Mediasoup
 */

import 'dotenv/config';
import { connectRedis, disconnectRedis } from '../../config/redis';
import { logger } from '../../config/logger';
import { mediasoupService } from './mediasoup.service';
import { signalingHandler } from './signaling.handler';

const PORT = parseInt(process.env.MEDIA_SERVER_PORT || '3002', 10);

async function start() {
  try {
    logger.info('Starting Media Server...');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected');

    // Initialize Mediasoup
    await mediasoupService.initialize();
    logger.info('Mediasoup initialized');

    // Initialize signaling handler
    await signalingHandler.initialize();
    logger.info('Signaling handler initialized');

    logger.info({ port: PORT }, 'Media Server started successfully');

    // Handle graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error({ error }, 'Failed to start Media Server');
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('Shutting down Media Server...');

  try {
    await signalingHandler.close();
    await mediasoupService.close();
    await disconnectRedis();
    logger.info('Media Server shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

// Start the server
start();
