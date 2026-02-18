/**
 * Metrics Routes
 * Prometheus metrics endpoint for monitoring
 */

import { FastifyInstance } from 'fastify';
import { metricsService } from '../services/monitoring/metrics.service';

/**
 * Register metrics routes
 */
export default async function metricsRoutes(app: FastifyInstance) {
  // Prometheus metrics endpoint
  app.get('/metrics', async (_request, reply) => {
    try {
      const metrics = await metricsService.getMetrics();
      reply.type(metricsService.getMetricsContentType());
      return metrics;
    } catch (error) {
      app.log.error({ err: error }, 'Error collecting metrics');
      reply.code(500);
      return 'Error collecting metrics';
    }
  });
}
