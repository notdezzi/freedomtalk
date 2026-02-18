/**
 * Sentry Client Configuration for Next.js
 * Error tracking and monitoring for the web application
 */

import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: !isProduction,

  // Set the release version
  release: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',

  // Replay configuration
  replaysOnErrorSampleRate: isProduction ? 0.1 : 1.0,
  replaysSessionSampleRate: isProduction ? 0.1 : 0,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    'Non-Error promise rejection captured',
    // Network errors
    'NetworkError',
    'Network request failed',
    'Failed to fetch',
    // Resize observer (common benign error)
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Canceled requests
    'canceled',
    'Cancel',
    // Chunk load errors (usually due to network or deployment)
    'ChunkLoadError',
    'Loading chunk',
    // Next.js specific
    'Hydration',
  ],
});

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

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

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
