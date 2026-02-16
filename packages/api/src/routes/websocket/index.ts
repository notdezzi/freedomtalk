/**
 * WebSocket Routes
 * Health and monitoring endpoints for WebSocket server
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { healthMonitor, HealthStatus } from '../../services/websocket/health.monitor';
import { wsServer } from '../../services/websocket/websocket.server';
import { logger } from '../../config/logger';

/**
 * Health response cache
 */
let healthCache: {
  data: any;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5000; // 5 seconds

/**
 * WebSocket routes
 */
export default async function websocketRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/websocket/health
   * Returns WebSocket server health status and metrics
   */
  app.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check cache
      const now = Date.now();
      if (healthCache && (now - healthCache.timestamp) < CACHE_TTL) {
        return reply.send(healthCache.data);
      }

      // Check if WebSocket server is initialized
      if (!wsServer.isInitialized()) {
        return reply.status(503).send({
          status: HealthStatus.UNHEALTHY,
          message: 'WebSocket server not initialized',
          timestamp: new Date().toISOString(),
        });
      }

      // Get health status and metrics
      const [status, metrics] = await Promise.all([
        healthMonitor.getHealth(),
        healthMonitor.getMetrics(),
      ]);

      const response = {
        status,
        metrics: {
          totalConnections: metrics.totalConnections,
          peakConnections: metrics.peakConnections,
          totalErrors: metrics.totalErrors,
          heartbeatFailures: metrics.heartbeatFailures,
          messagesSent: metrics.messagesSent,
          messagesReceived: metrics.messagesReceived,
          averageLatency: Math.round(metrics.averageLatency),
          lastUpdated: metrics.lastUpdated,
        },
        timestamp: new Date().toISOString(),
      };

      // Cache response
      healthCache = {
        data: response,
        timestamp: now,
      };

      // Return 503 if unhealthy
      if (status === HealthStatus.UNHEALTHY) {
        return reply.status(503).send(response);
      }

      return reply.send(response);
    } catch (error) {
      logger.error({ error }, 'Error getting WebSocket health');
      return reply.status(500).send({
        status: HealthStatus.UNHEALTHY,
        message: 'Failed to get health status',
        timestamp: new Date().toISOString(),
      });
    }
  });
}

