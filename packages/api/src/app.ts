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
import { RedisRateLimitStore } from './config/rate-limit-store';
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
    // Behind a reverse proxy (nginx/caddy) that sets X-Forwarded-For, trust
    // the proxy so request.ip is the real client IP — without this every
    // client shares the proxy's IP and rate limits collapse into one bucket.
    trustProxy: process.env.TRUST_PROXY === 'true',
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

  // Cookie support — the cookie secret must never silently fall back to the
  // committed default in production.
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

  // Swagger documentation — explicit opt-in outside development
  if (isDevelopment || process.env.SWAGGER_ENABLED === 'true') {
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
  }

  // Rate limiting (skip in tests)
  // Redis-backed store so limits are shared across scaled API instances
  // (in-memory stores would count separately per process behind the load
  // balancer). Falls back to in-memory when REDIS is not usable.
  if (!options.skipRateLimit) {
    await app.register(rateLimit, {
      global: true,
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
      ...(process.env.RATE_LIMIT_STORE === 'redis' && process.env.REDIS_URL
        ? { store: RedisRateLimitStore }
        : { cache: 10000 }),
      skipOnError: true,
      // Add rate limiting headers to all responses
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
        'retry-after': true,
      },
      // Add hooks for rate limit events
      onExceeded: (request) => {
        const route = request.url.replace(/\/[0-9]{15,}/g, '/:id');
        captureException(new Error('Rate limit exceeded'), {
          route,
          ip: request.ip,
          method: request.method,
        });
      },
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

