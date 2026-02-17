import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { testConnection, closePool, connectRedis, disconnectRedis } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes/index.js';
import { wsServer } from './services/websocket/websocket.server';
import { registerHandlers } from './services/websocket/handlers';
import { initializeMeilisearchIndices } from './services/search/meilisearch.client.js';

/**
 * Main application entry point
 * Initializes Fastify server with middleware and infrastructure connections
 */

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const isDevelopment = process.env.NODE_ENV !== 'production';

// Create Fastify instance with logger
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
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

  // Cookie support
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'freedomtalk-cookie-secret-change-in-production',
    parseOptions: {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: 'lax',
    },
  });

  // Swagger documentation (register before routes)
  if (process.env.SWAGGER_ENABLED !== 'false') {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'FreedomTalk API',
          description: 'Discord clone backend API - Real-time communication platform',
          version: '0.1.0',
          contact: {
            name: 'FreedomTalk Team',
            url: 'https://github.com/freedomtalk',
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
          },
        },
        servers: [
          {
            url: `http://localhost:${PORT}`,
            description: 'Development server',
          },
        ],
        tags: [
          { name: 'auth', description: 'Authentication endpoints' },
          { name: 'users', description: 'User management endpoints' },
          { name: 'health', description: 'Health check endpoints' },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT access token',
            },
            cookieAuth: {
              type: 'apiKey',
              in: 'cookie',
              name: 'session',
              description: 'Session cookie',
            },
          },
        },
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
    });
  }

  // Rate limiting (in-memory store)
  // Note: Using in-memory store for now. For distributed rate limiting across
  // multiple instances, consider using ioredis client in future milestone.
  await app.register(rateLimit, {
    global: true,
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    cache: 10000, // Cache size for in-memory store
    skipOnError: true,
  });

  // Error handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);
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

  // Register API routes
  await app.register(routes);
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
    app.log.info('Database connection established');

    // Connect to Redis
    await connectRedis();
    app.log.info('Redis connection established');

    // Initialize Meilisearch indices
    try {
      await initializeMeilisearchIndices();
      app.log.info('Meilisearch indices initialized');
    } catch (error) {
      // Non-fatal: Search may not be available
      app.log.warn({ err: error }, 'Meilisearch initialization failed (search may be unavailable)');
    }
  } catch (error) {
    app.log.error({ err: error }, 'Failed to initialize infrastructure');
    throw error;
  }
}

/**
 * Initialize WebSocket server
 */
async function initializeWebSocket() {
  try {
    // Initialize WebSocket server with Fastify HTTP server
    await wsServer.initialize(app.server);
    app.log.info('WebSocket server initialized');

    // Register all event handlers
    registerHandlers(wsServer.getIO());
    app.log.info('WebSocket event handlers registered');
  } catch (error) {
    app.log.error({ err: error }, 'Failed to initialize WebSocket server');
    throw error;
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string) {
  app.log.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Close WebSocket server first (with 30s timeout)
    const wsClosePromise = wsServer.close();
    const wsTimeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        app.log.warn('WebSocket shutdown timeout, forcing close');
        resolve();
      }, 30000); // 30 second timeout
    });

    await Promise.race([wsClosePromise, wsTimeout]);
    app.log.info('WebSocket server closed');

    // Close Fastify server
    await app.close();
    app.log.info('Fastify server closed');

    // Close database pool
    await closePool();
    app.log.info('Database pool closed');

    // Disconnect Redis
    await disconnectRedis();
    app.log.info('Redis disconnected');

    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'Error during graceful shutdown');
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

    // Initialize infrastructure
    await initializeInfrastructure();

    // Register routes
    await registerRoutes();

    // Start listening
    await app.listen({ port: PORT, host: HOST });

    app.log.info(`Server listening on ${HOST}:${PORT}`);

    // Initialize WebSocket server after Fastify starts
    await initializeWebSocket();
  } catch (error) {
    app.log.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  app.log.error({ err: error }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  app.log.error({ err: reason }, 'Unhandled rejection');
  gracefulShutdown('unhandledRejection');
});

// Start the application
start();

