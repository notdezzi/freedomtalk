/**
 * Metrics Service
 * Prometheus metrics collection for monitoring
 */

import client, { Registry, Counter, Histogram, Gauge } from 'prom-client';

// Create a custom registry
const register = new Registry();

// Default metrics (CPU, memory, etc.)
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register });

// HTTP Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5, 10],
  registers: [register],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestsInProgress = new Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently in progress',
  labelNames: ['method', 'route'],
  registers: [register],
});

// WebSocket Metrics
export const websocketConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

export const websocketMessagesReceived = new Counter({
  name: 'websocket_messages_received_total',
  help: 'Total number of WebSocket messages received',
  labelNames: ['event_type'],
  registers: [register],
});

export const websocketMessagesSent = new Counter({
  name: 'websocket_messages_sent_total',
  help: 'Total number of WebSocket messages sent',
  labelNames: ['event_type'],
  registers: [register],
});

export const websocketErrors = new Counter({
  name: 'websocket_errors_total',
  help: 'Total number of WebSocket errors',
  labelNames: ['error_type'],
  registers: [register],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

export const dbConnectionsIdle = new Gauge({
  name: 'db_connections_idle',
  help: 'Number of idle database connections',
  registers: [register],
});

export const dbQueryErrors = new Counter({
  name: 'db_query_errors_total',
  help: 'Total number of database query errors',
  labelNames: ['query_type', 'error_code'],
  registers: [register],
});

// Voice Metrics
export const voiceChannelsActive = new Gauge({
  name: 'voice_channels_active',
  help: 'Number of active voice channels',
  registers: [register],
});

export const voiceUsersConnected = new Gauge({
  name: 'voice_users_connected',
  help: 'Number of users connected to voice',
  registers: [register],
});

export const voiceCallDuration = new Histogram({
  name: 'voice_call_duration_seconds',
  help: 'Duration of voice calls in seconds',
  buckets: [10, 30, 60, 300, 600, 1800, 3600, 7200],
  registers: [register],
});

// Message Metrics
export const messagesCreated = new Counter({
  name: 'messages_created_total',
  help: 'Total number of messages created',
  labelNames: ['channel_type'],
  registers: [register],
});

export const messagesDeleted = new Counter({
  name: 'messages_deleted_total',
  help: 'Total number of messages deleted',
  labelNames: ['channel_type'],
  registers: [register],
});

// Authentication Metrics
export const authAttempts = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status'],
  registers: [register],
});

export const activeSessions = new Gauge({
  name: 'auth_active_sessions',
  help: 'Number of active user sessions',
  registers: [register],
});

// Error Metrics
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of application errors',
  labelNames: ['type', 'code'],
  registers: [register],
});

// Rate Limiting Metrics
export const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['route', 'ip'],
  registers: [register],
});

/**
 * Get the metrics registry
 */
export function getMetricsRegistry(): Registry {
  return register;
}

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get metrics content type
 */
export function getMetricsContentType(): string {
  return register.contentType;
}

/**
 * Update database connection metrics
 */
export function updateDbConnectionMetrics(active: number, idle: number): void {
  dbConnectionsActive.set(active);
  dbConnectionsIdle.set(idle);
}

/**
 * Track HTTP request
 */
export function trackHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number
): void {
  httpRequestDuration.labels(method, route, String(statusCode)).observe(durationSeconds);
  httpRequestsTotal.labels(method, route, String(statusCode)).inc();
}

/**
 * Increment in-progress requests
 */
export function incrementHttpRequestsInProgress(method: string, route: string): void {
  httpRequestsInProgress.labels(method, route).inc();
}

/**
 * Decrement in-progress requests
 */
export function decrementHttpRequestsInProgress(method: string, route: string): void {
  httpRequestsInProgress.labels(method, route).dec();
}

/**
 * Track WebSocket connection
 */
export function trackWebSocketConnection(delta: number): void {
  websocketConnections.inc(delta);
}

/**
 * Track WebSocket message
 */
export function trackWebSocketMessage(direction: 'received' | 'sent', eventType: string): void {
  if (direction === 'received') {
    websocketMessagesReceived.labels(eventType).inc();
  } else {
    websocketMessagesSent.labels(eventType).inc();
  }
}

/**
 * Track WebSocket error
 */
export function trackWebSocketError(errorType: string): void {
  websocketErrors.labels(errorType).inc();
}

/**
 * Track database query
 */
export function trackDbQuery(
  queryType: string,
  table: string,
  durationSeconds: number
): void {
  dbQueryDuration.labels(queryType, table).observe(durationSeconds);
}

/**
 * Track database error
 */
export function trackDbError(queryType: string, errorCode: string): void {
  dbQueryErrors.labels(queryType, errorCode).inc();
}

/**
 * Update voice metrics
 */
export function updateVoiceMetrics(channels: number, users: number): void {
  voiceChannelsActive.set(channels);
  voiceUsersConnected.set(users);
}

/**
 * Track voice call duration
 */
export function trackVoiceCallDuration(durationSeconds: number): void {
  voiceCallDuration.observe(durationSeconds);
}

/**
 * Track message creation
 */
export function trackMessageCreated(channelType: string): void {
  messagesCreated.labels(channelType).inc();
}

/**
 * Track message deletion
 */
export function trackMessageDeleted(channelType: string): void {
  messagesDeleted.labels(channelType).inc();
}

/**
 * Track authentication attempt
 */
export function trackAuthAttempt(method: string, status: 'success' | 'failure'): void {
  authAttempts.labels(method, status).inc();
}

/**
 * Update active sessions count
 */
export function updateActiveSessions(count: number): void {
  activeSessions.set(count);
}

/**
 * Track application error
 */
export function trackError(type: string, code: string): void {
  errorsTotal.labels(type, code).inc();
}

/**
 * Track rate limit hit
 */
export function trackRateLimitHit(route: string, ip: string): void {
  rateLimitHits.labels(route, ip).inc();
}

export const metricsService = {
  getMetricsRegistry,
  getMetrics,
  getMetricsContentType,
  updateDbConnectionMetrics,
  trackHttpRequest,
  incrementHttpRequestsInProgress,
  decrementHttpRequestsInProgress,
  trackWebSocketConnection,
  trackWebSocketMessage,
  trackWebSocketError,
  trackDbQuery,
  trackDbError,
  updateVoiceMetrics,
  trackVoiceCallDuration,
  trackMessageCreated,
  trackMessageDeleted,
  trackAuthAttempt,
  updateActiveSessions,
  trackError,
  trackRateLimitHit,
};
