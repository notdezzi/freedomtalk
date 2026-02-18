/**
 * Sentry Edge Configuration for Next.js
 * Error tracking for edge runtime (middleware)
 */

import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: !isProduction,

  // Set the release version
  release: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
});
