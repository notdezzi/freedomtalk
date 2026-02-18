/**
 * Fastify App Builder
 * Exports a build function for creating Fastify instances (used in tests and main server)
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { registerMetricsMiddleware } from './middleware/metrics.middleware';
import { initSentry, sentryMiddleware, captureException } from './config/sentry';
import routes from './routes';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Initialize Sentry error tracking
initSentry();

/**
 * Build and configure Fastify application
 * @param options - Build options
 * @param options.skipRateLimit - Skip rate limiting (useful for tests)
 * @returns Configured Fastify instance
 */
export async function build(options: { skipRateLimit?: boolean } = {}): Promise<FastifyInstance> {
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

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // CORS
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

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'FreedomTalk API',
        description: 'REST API for FreedomTalk - A Discord clone',
        version: '0.1.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
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
  });

  // Rate limiting (skip in tests)
  // Note: Using in-memory store for now. For distributed rate limiting across
  // multiple instances, consider using ioredis client in future milestone.
  if (!options.skipRateLimit) {
    await app.register(rateLimit, {
      global: true,
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
      cache: 10000, // Cache size for in-memory store
      skipOnError: true,
    });
  }

  // Error handlers (must be registered BEFORE routes)
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Sentry middleware for error tracking
  const sentry = sentryMiddleware();
  app.addHook('onRequest', async (request) => {
    sentry.onRequest(request as { user?: { id: string; username?: string } });
  });
  app.addHook('onError', async (_request, _reply, error) => {
    sentry.onError(error);
  });

  // Register metrics middleware for Prometheus
  registerMetricsMiddleware(app);

  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Register routes
  await app.register(routes);

  return app;
}

