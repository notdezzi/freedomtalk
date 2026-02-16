import { logger } from '../../config/logger';
import { getRedisClient } from '../../config/redis';
export var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "healthy";
    HealthStatus["DEGRADED"] = "degraded";
    HealthStatus["UNHEALTHY"] = "unhealthy";
})(HealthStatus || (HealthStatus = {}));
class HealthMonitor {
    REDIS_KEY = 'websocket:metrics';
    METRICS_TTL = 3600;
    metrics = {
        totalConnections: 0,
        connectionsPerUser: {},
        totalErrors: 0,
        heartbeatFailures: 0,
        messagesSent: 0,
        messagesReceived: 0,
        averageLatency: 0,
        peakConnections: 0,
        lastUpdated: new Date().toISOString(),
    };
    async incrementMetric(metric, value = 1) {
        try {
            this.metrics[metric] = this.metrics[metric] + value;
            this.metrics.lastUpdated = new Date().toISOString();
            if (metric === 'totalConnections' && this.metrics.totalConnections > this.metrics.peakConnections) {
                this.metrics.peakConnections = this.metrics.totalConnections;
            }
            await this.persistMetrics();
        }
        catch (error) {
            logger.error({ error, metric, value }, 'Error incrementing metric');
        }
    }
    async setTotalConnections(count) {
        try {
            this.metrics.totalConnections = count;
            this.metrics.lastUpdated = new Date().toISOString();
            if (count > this.metrics.peakConnections) {
                this.metrics.peakConnections = count;
            }
            await this.persistMetrics();
        }
        catch (error) {
            logger.error({ error, count }, 'Error setting total connections');
        }
    }
    async updateAverageLatency(latency) {
        try {
            const alpha = 0.1;
            this.metrics.averageLatency = this.metrics.averageLatency * (1 - alpha) + latency * alpha;
            this.metrics.lastUpdated = new Date().toISOString();
            await this.persistMetrics();
        }
        catch (error) {
            logger.error({ error, latency }, 'Error updating average latency');
        }
    }
    async getMetrics() {
        try {
            await this.loadMetrics();
            return { ...this.metrics };
        }
        catch (error) {
            logger.error({ error }, 'Error getting metrics');
            return { ...this.metrics };
        }
    }
    async getHealth() {
        try {
            await this.loadMetrics();
            const totalOperations = this.metrics.messagesSent + this.metrics.messagesReceived;
            const errorRate = totalOperations > 0 ? this.metrics.totalErrors / totalOperations : 0;
            const heartbeatFailureRate = this.metrics.totalConnections > 0
                ? this.metrics.heartbeatFailures / this.metrics.totalConnections
                : 0;
            if (errorRate > 0.1 || heartbeatFailureRate > 0.2 || this.metrics.averageLatency > 1000) {
                return HealthStatus.UNHEALTHY;
            }
            if (errorRate > 0.05 || heartbeatFailureRate > 0.1 || this.metrics.averageLatency > 500) {
                return HealthStatus.DEGRADED;
            }
            return HealthStatus.HEALTHY;
        }
        catch (error) {
            logger.error({ error }, 'Error getting health status');
            return HealthStatus.UNHEALTHY;
        }
    }
    async resetMetrics() {
        try {
            this.metrics = {
                totalConnections: 0,
                connectionsPerUser: {},
                totalErrors: 0,
                heartbeatFailures: 0,
                messagesSent: 0,
                messagesReceived: 0,
                averageLatency: 0,
                peakConnections: 0,
                lastUpdated: new Date().toISOString(),
            };
            await this.persistMetrics();
            logger.info('Metrics reset');
        }
        catch (error) {
            logger.error({ error }, 'Error resetting metrics');
        }
    }
    async persistMetrics() {
        try {
            const redis = await getRedisClient();
            await redis.set(this.REDIS_KEY, JSON.stringify(this.metrics), {
                EX: this.METRICS_TTL,
            });
        }
        catch (error) {
            logger.error({ error }, 'Error persisting metrics to Redis');
        }
    }
    async loadMetrics() {
        try {
            const redis = await getRedisClient();
            const data = await redis.get(this.REDIS_KEY);
            if (data) {
                this.metrics = JSON.parse(data);
            }
        }
        catch (error) {
            logger.error({ error }, 'Error loading metrics from Redis');
        }
    }
}
export const healthMonitor = new HealthMonitor();
//# sourceMappingURL=health.monitor.js.map