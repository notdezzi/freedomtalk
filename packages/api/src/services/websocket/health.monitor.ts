import { logger } from '../../config/logger';
import { getRedisClient } from '../../config/redis';

/**
 * Health status enum
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

/**
 * Metrics interface
 */
export interface Metrics {
  totalConnections: number;
  connectionsPerUser: Record<string, number>;
  totalErrors: number;
  heartbeatFailures: number;
  messagesSent: number;
  messagesReceived: number;
  averageLatency: number;
  peakConnections: number;
  lastUpdated: string;
}

/**
 * Health Monitor class
 * Monitors WebSocket connection health and tracks metrics
 */
class HealthMonitor {
  private readonly REDIS_KEY = 'websocket:metrics';
  private readonly METRICS_TTL = 3600; // 1 hour

  private metrics: Metrics = {
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

  /**
   * Increment a metric
   * @param metric - Metric name
   * @param value - Value to increment by (default: 1)
   */
  async incrementMetric(metric: keyof Omit<Metrics, 'connectionsPerUser' | 'lastUpdated'>, value: number = 1): Promise<void> {
    try {
      this.metrics[metric] = (this.metrics[metric] as number) + value;
      this.metrics.lastUpdated = new Date().toISOString();

      // Update peak connections
      if (metric === 'totalConnections' && this.metrics.totalConnections > this.metrics.peakConnections) {
        this.metrics.peakConnections = this.metrics.totalConnections;
      }

      // Persist to Redis
      await this.persistMetrics();
    } catch (error) {
      logger.error({ error, metric, value }, 'Error incrementing metric');
    }
  }

  /**
   * Set total connections
   * @param count - Connection count
   */
  async setTotalConnections(count: number): Promise<void> {
    try {
      this.metrics.totalConnections = count;
      this.metrics.lastUpdated = new Date().toISOString();

      // Update peak connections
      if (count > this.metrics.peakConnections) {
        this.metrics.peakConnections = count;
      }

      await this.persistMetrics();
    } catch (error) {
      logger.error({ error, count }, 'Error setting total connections');
    }
  }

  /**
   * Update average latency
   * @param latency - Latency in milliseconds
   */
  async updateAverageLatency(latency: number): Promise<void> {
    try {
      // Simple moving average
      const alpha = 0.1; // Smoothing factor
      this.metrics.averageLatency = this.metrics.averageLatency * (1 - alpha) + latency * alpha;
      this.metrics.lastUpdated = new Date().toISOString();

      await this.persistMetrics();
    } catch (error) {
      logger.error({ error, latency }, 'Error updating average latency');
    }
  }

  /**
   * Get current metrics
   * @returns Current metrics
   */
  async getMetrics(): Promise<Metrics> {
    try {
      // Load from Redis to get latest across instances
      await this.loadMetrics();
      return { ...this.metrics };
    } catch (error) {
      logger.error({ error }, 'Error getting metrics');
      return { ...this.metrics };
    }
  }

  /**
   * Get health status
   * @returns Health status
   */
  async getHealth(): Promise<HealthStatus> {
    try {
      await this.loadMetrics();

      // Check error rate
      const totalOperations = this.metrics.messagesSent + this.metrics.messagesReceived;
      const errorRate = totalOperations > 0 ? this.metrics.totalErrors / totalOperations : 0;

      // Check heartbeat failure rate
      const heartbeatFailureRate = this.metrics.totalConnections > 0 
        ? this.metrics.heartbeatFailures / this.metrics.totalConnections 
        : 0;

      // Determine health status
      if (errorRate > 0.1 || heartbeatFailureRate > 0.2 || this.metrics.averageLatency > 1000) {
        return HealthStatus.UNHEALTHY;
      }

      if (errorRate > 0.05 || heartbeatFailureRate > 0.1 || this.metrics.averageLatency > 500) {
        return HealthStatus.DEGRADED;
      }

      return HealthStatus.HEALTHY;
    } catch (error) {
      logger.error({ error }, 'Error getting health status');
      return HealthStatus.UNHEALTHY;
    }
  }

  /**
   * Reset metrics
   */
  async resetMetrics(): Promise<void> {
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
    } catch (error) {
      logger.error({ error }, 'Error resetting metrics');
    }
  }

  /**
   * Persist metrics to Redis
   */
  private async persistMetrics(): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.set(this.REDIS_KEY, JSON.stringify(this.metrics), {
        EX: this.METRICS_TTL,
      });
    } catch (error) {
      logger.error({ error }, 'Error persisting metrics to Redis');
    }
  }

  /**
   * Load metrics from Redis
   */
  private async loadMetrics(): Promise<void> {
    try {
      const redis = await getRedisClient();
      const data = await redis.get(this.REDIS_KEY);
      
      if (data) {
        this.metrics = JSON.parse(data);
      }
    } catch (error) {
      logger.error({ error }, 'Error loading metrics from Redis');
    }
  }
}

// Export singleton instance
export const healthMonitor = new HealthMonitor();

