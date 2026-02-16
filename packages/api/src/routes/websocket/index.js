import { healthMonitor, HealthStatus } from '../../services/websocket/health.monitor';
import { wsServer } from '../../services/websocket/websocket.server';
import { logger } from '../../config/logger';
let healthCache = null;
const CACHE_TTL = 5000;
export default async function websocketRoutes(app) {
    app.get('/health', async (_request, reply) => {
        try {
            const now = Date.now();
            if (healthCache && (now - healthCache.timestamp) < CACHE_TTL) {
                return reply.send(healthCache.data);
            }
            if (!wsServer.isInitialized()) {
                return reply.status(503).send({
                    status: HealthStatus.UNHEALTHY,
                    message: 'WebSocket server not initialized',
                    timestamp: new Date().toISOString(),
                });
            }
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
            healthCache = {
                data: response,
                timestamp: now,
            };
            if (status === HealthStatus.UNHEALTHY) {
                return reply.status(503).send(response);
            }
            return reply.send(response);
        }
        catch (error) {
            logger.error({ error }, 'Error getting WebSocket health');
            return reply.status(500).send({
                status: HealthStatus.UNHEALTHY,
                message: 'Failed to get health status',
                timestamp: new Date().toISOString(),
            });
        }
    });
}
//# sourceMappingURL=index.js.map