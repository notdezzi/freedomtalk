import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { logger, testConnection, closePool, connectRedis, disconnectRedis } from './config';

/**
 * Main application entry point
 * Initializes Fastify server with middleware and infrastructure connections
 */

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Create Fastify instance with logger
const app = Fastify({
  logger,
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
  requestIdHeader: 'x-request-id',
});

/**
 * Register plugins and middleware
 */
async function registerPlugins() {
  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disable for development, configure properly in production
  });

  // CORS configuration
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });
}

/**
 * Register routes
 */
async function registerRoutes() {
  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // API info endpoint
  app.get('/api/v1', async () => {
    return {
      name: 'FreedomTalk API',
      version: '0.1.0',
      description: 'Discord clone backend API',
    };
  });
}

/**
 * Initialize infrastructure connections
 */
async function initializeInfrastructure() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    logger.info('Database connection established');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize infrastructure');
    throw error;
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Close Fastify server
    await app.close();
    logger.info('Fastify server closed');

    // Close database pool
    await closePool();
    logger.info('Database pool closed');

    // Disconnect Redis
    await disconnectRedis();
    logger.info('Redis disconnected');

    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

/**
 * Start the server
 */
async function start() {
  try {
    // Register plugins
    await registerPlugins();

    // Register routes
    await registerRoutes();

    // Initialize infrastructure
    await initializeInfrastructure();

    // Start listening
    await app.listen({ port: PORT, host: HOST });

    logger.info(`Server listening on ${HOST}:${PORT}`);
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
  gracefulShutdown('unhandledRejection');
});

// Start the application
start();

