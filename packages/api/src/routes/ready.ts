/**
 * Readiness Route
 *
 * GET /ready - dependency-aware readiness probe. /health stays pure
 * liveness (process up); /ready reports each dependency so orchestrators
 * can decide whether this instance should receive traffic.
 *
 * Probes (2s timeout each, run concurrently):
 * - postgres:    SELECT 1 on the shared pg pool            (required)
 * - redis:       PING via the shared redis client          (required)
 * - rabbitmq:    shared channel presence (never connects from the request
 *                path; publishing degrades gracefully by design)
 * - meilisearch: GET {MEILISEARCH_HOST}/health             (optional)
 * - mediasoup:   'unknown' - worker liveness has no cheap check
 *
 * HTTP 503 only when a REQUIRED dependency (postgres/redis) is down;
 * optional dependencies failing yield 200 with status 'degraded'.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../config/database';
import { getRedisClient } from '../config/redis';
import { getRabbitChannel } from '../config/rabbitmq';

const PROBE_TIMEOUT_MS = 2000;

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';

type DependencyStatus = 'ok' | 'fail' | 'unknown';

interface DependencyMap {
  postgres: DependencyStatus;
  redis: DependencyStatus;
  rabbitmq: DependencyStatus;
  meilisearch: DependencyStatus;
  mediasoup: DependencyStatus;
}

/** Dependencies this instance cannot serve traffic without */
const REQUIRED_DEPENDENCIES: Array<keyof DependencyMap> = ['postgres', 'redis'];

/**
 * Race a probe against the per-probe timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`probe timed out after ${ms}ms`)), ms);
    }),
  ]);
}

/**
 * Map an allSettled outcome to a probe status (rejection means 'fail')
 */
function settle(result: PromiseSettledResult<DependencyStatus>): DependencyStatus {
  return result.status === 'fulfilled' ? result.value : 'fail';
}

/**
 * Postgres: SELECT 1 on the shared pool
 */
async function probePostgres(): Promise<DependencyStatus> {
  const result = await withTimeout(pool.query('SELECT 1'), PROBE_TIMEOUT_MS);
  return result.rowCount === 1 ? 'ok' : 'fail';
}

/**
 * Redis: PING via the shared client (getRedisClient is the accessor
 * that returns the active connection)
 */
async function probeRedis(): Promise<DependencyStatus> {
  const client = await getRedisClient();
  const pong = await withTimeout(client.ping(), PROBE_TIMEOUT_MS);
  return pong === 'PONG' ? 'ok' : 'fail';
}

/**
 * RabbitMQ: report on the shared channel only - never connect from the
 * request path (the broker is optional by design; events are dropped
 * and republished-later is handled by reconnect logic)
 */
function probeRabbitMQ(): DependencyStatus {
  return getRabbitChannel() ? 'ok' : 'fail';
}

/**
 * Meilisearch: GET /health on the configured host
 */
async function probeMeilisearch(): Promise<DependencyStatus> {
  const response = await fetch(`${MEILISEARCH_HOST}/health`, {
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  return response.ok ? 'ok' : 'fail';
}

/**
 * Mediasoup: worker liveness is not cheaply checkable (workers array is
 * private and there is no health getter), so report 'unknown'. An
 * 'unknown' status never fails readiness.
 */
function probeMediasoup(): DependencyStatus {
  return 'unknown';
}

/**
 * Run all dependency probes concurrently
 */
async function checkDependencies(): Promise<DependencyMap> {
  const [postgres, redis, meilisearch] = await Promise.allSettled([
    probePostgres(),
    probeRedis(),
    probeMeilisearch(),
  ]);

  return {
    postgres: settle(postgres),
    redis: settle(redis),
    rabbitmq: probeRabbitMQ(),
    meilisearch: settle(meilisearch),
    mediasoup: probeMediasoup(),
  };
}

/**
 * GET /ready handler
 */
export async function readyHandler(_request: FastifyRequest, reply: FastifyReply) {
  const dependencies = await checkDependencies();

  const requiredOk = REQUIRED_DEPENDENCIES.every((name) => dependencies[name] === 'ok');
  const allOk = Object.values(dependencies).every((status) => status === 'ok');

  reply.code(requiredOk ? 200 : 503);
  return {
    status: allOk ? 'ok' : 'degraded',
    dependencies,
    timestamp: new Date().toISOString(),
  };
}
