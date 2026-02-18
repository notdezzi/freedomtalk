/**
 * Sentry Configuration
 * Error tracking and monitoring for the API
 */

import * as Sentry from '@sentry/node';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Initialize Sentry for error tracking
 */
export function initSentry(): void {
  if (!process.env.SENTRY_DSN) {
    console.log('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: isProduction ? 0.1 : 1.0,

    // Set profilesSampleRate to 1.0 to profile 100%
    // of sampled transactions.
    // We recommend adjusting this value in production
    profilesSampleRate: isProduction ? 0.1 : 1.0,

    // Ignore specific errors
    ignoreErrors: [
      // Ignore network errors that are not actionable
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      // Ignore client abort errors
      'ERR_STREAM_PREMATURE_CLOSE',
      // Ignore rate limit errors (these are expected)
      'FST_ERR_RATE_LIMIT',
    ],

    // Don't send events in development unless explicitly enabled
    beforeSend(event) {
      if (!isProduction && process.env.SENTRY_ENABLE_IN_DEV !== 'true') {
        return null;
      }
      return event;
    },
  });

  console.log('Sentry initialized successfully');
}

/**
 * Capture an exception with Sentry
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture a message with Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: { id: string; username?: string; email?: string } | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Create a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): Sentry.Transaction {
  return Sentry.startTransaction({ name, op });
}

/**
 * Sentry middleware for Fastify
 */
export function sentryMiddleware(): {
  onRequest: (request: { user?: { id: string; username?: string } }) => void;
  onError: (error: Error) => void;
} {
  return {
    onRequest: (request) => {
      if (request.user) {
        setUserContext({
          id: request.user.id,
          username: request.user.username,
        });
      }
      addBreadcrumb(`Request received`, 'http', 'info');
    },
    onError: (error) => {
      captureException(error);
    },
  };
}

export { Sentry };
