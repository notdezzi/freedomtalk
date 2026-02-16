export declare enum HealthStatus {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    UNHEALTHY = "unhealthy"
}
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
declare class HealthMonitor {
    private readonly REDIS_KEY;
    private readonly METRICS_TTL;
    private metrics;
    incrementMetric(metric: keyof Omit<Metrics, 'connectionsPerUser' | 'lastUpdated'>, value?: number): Promise<void>;
    setTotalConnections(count: number): Promise<void>;
    updateAverageLatency(latency: number): Promise<void>;
    getMetrics(): Promise<Metrics>;
    getHealth(): Promise<HealthStatus>;
    resetMetrics(): Promise<void>;
    private persistMetrics;
    private loadMetrics;
}
export declare const healthMonitor: HealthMonitor;
export {};
//# sourceMappingURL=health.monitor.d.ts.map