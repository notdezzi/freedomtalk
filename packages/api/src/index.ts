import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { testConnection, closePool, connectRedis, disconnectRedis } from './config';
import { startOtel, stopOtel } from './config/otel';
import { connectRabbitMQ, disconnectRabbitMQ } from './config/rabbitmq';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { RedisRateLimitStore } from './config/rate-limit-store';
import routes from './routes/index.js';
import { readyHandler } from './routes/ready';
import { wsServer } from './services/websocket/websocket.server';
import { registerHandlers } from './services/websocket/handlers';
import { initializeMeilisearchIndices } from './services/search/meilisearch.client.js';
import { mediasoupService } from './services/voice/mediasoup.service';
import { voiceHandler } from './services/websocket/handlers/voice.handler';

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
  // Trust the reverse proxy (see app.ts) so rate limits key on real client IPs
  trustProxy: process.env.TRUST_PROXY === 'true',
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

  // Cookie support — fail fast rather than silently using the committed
  // default secret in production.
  const cookieSecret =
    process.env.COOKIE_SECRET ||
    (isDevelopment ? 'freedomtalk-cookie-secret-change-in-production' : '');
  if (!cookieSecret) {
    throw new Error('COOKIE_SECRET must be set in production');
  }
  await app.register(cookie, {
    secret: cookieSecret,
    parseOptions: {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: 'lax',
    },
  });

  // Swagger documentation (register before routes) — explicit opt-in
  // outside development so /docs never ships by default in production.
  if (isDevelopment || process.env.SWAGGER_ENABLED === 'true') {
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

  // Rate limiting — Redis-backed when configured so limits are shared
  // across scaled API instances (see app.ts for rationale).
  await app.register(rateLimit, {
    global: true,
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    ...(process.env.RATE_LIMIT_STORE === 'redis' && process.env.REDIS_URL
      ? { store: RedisRateLimitStore }
      : { cache: 10000 }),
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
  // Health check endpoint (pure liveness)
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Readiness endpoint (dependency-aware probes)
  app.get('/ready', readyHandler);

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

    // Initialize Mediasoup for voice/video
    try {
      await mediasoupService.initialize();
      app.log.info('Mediasoup service initialized');
    } catch (error) {
      // Non-fatal in development - voice may not work
      app.log.warn({ err: error }, 'Mediasoup initialization failed (voice/video may be unavailable)');
    }

    // Initialize voice handler for WebSocket signaling
    try {
      await voiceHandler.initialize();
      app.log.info('Voice handler initialized');
    } catch (error) {
      app.log.warn({ err: error }, 'Voice handler initialization failed');
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
    // Close voice handler
    try {
      await voiceHandler.close();
      app.log.info('Voice handler closed');
    } catch (error) {
      app.log.warn({ err: error }, 'Error closing voice handler');
    }

    // Close mediasoup service
    try {
      await mediasoupService.close();
      app.log.info('Mediasoup service closed');
    } catch (error) {
      app.log.warn({ err: error }, 'Error closing mediasoup service');
    }

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

    // Disconnect RabbitMQ
    await disconnectRabbitMQ();
    app.log.info('RabbitMQ disconnected');

    // Flush any pending OpenTelemetry spans
    await stopOtel();

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
    // Start OpenTelemetry (no-op unless OTEL_ENABLED=true) before any
    // infrastructure connects so instrumentation patches apply
    startOtel();

    // Register plugins
    await registerPlugins();

    // Initialize infrastructure
    await initializeInfrastructure();

    // Register routes
    await registerRoutes();

    // Start listening
    await app.listen({ port: PORT, host: HOST });

    app.log.info(`Server listening on ${HOST}:${PORT}`);

    // Connect to RabbitMQ in the background (non-fatal): the API publishes
    // domain events for the search/embed/mention worker pipeline but must
    // serve traffic even while the broker is down — publishEvent() drops
    // events with a warning until the connection lands.
    connectRabbitMQ({ required: false, retries: 10 }).catch(() => undefined);

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

