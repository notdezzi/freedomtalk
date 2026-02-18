/**
 * Metrics Middleware
 * Tracks HTTP request metrics for Prometheus
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { metricsService } from '../services/monitoring/metrics.service';

/**
 * Get route pattern from URL (replace params with placeholders)
 */
function getRoutePattern(url: string): string {
  // Replace UUIDs and numeric IDs with placeholders
  return url
    .replace(/\/[0-9]{15,}/g, '/:id')  // Snowflake IDs
    .replace(/\/[a-f0-9-]{36}/gi, '/:uuid')  // UUIDs
    .replace(/\?.*$/, '');  // Remove query strings
}

/**
 * Register metrics tracking middleware
 */
export function registerMetricsMiddleware(app: FastifyInstance): void {
  // Track request start
  app.addHook('onRequest', async (request: FastifyRequest) => {
    const route = getRoutePattern(request.url);
    metricsService.incrementHttpRequestsInProgress(request.method, route);
    (request as any).startTime = Date.now();
  });

  // Track request end
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const route = getRoutePattern(request.url);
    const startTime = (request as any).startTime || Date.now();
    const duration = (Date.now() - startTime) / 1000;

    metricsService.decrementHttpRequestsInProgress(request.method, route);
    metricsService.trackHttpRequest(request.method, route, reply.statusCode, duration);
  });

  // Track errors
  app.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    const route = getRoutePattern(request.url);
    const startTime = (request as any).startTime || Date.now();
    const duration = (Date.now() - startTime) / 1000;

    metricsService.trackHttpRequest(request.method, route, reply.statusCode || 500, duration);
    metricsService.trackError('http', error.name || 'UnknownError');
  });
}
