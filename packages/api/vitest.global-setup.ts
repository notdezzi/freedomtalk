/**
 * Vitest global setup: provisions test infrastructure via Testcontainers.
 *
 * Starts Postgres, Redis and RabbitMQ containers once per test run, runs
 * database migrations, and writes connection details to a JSON file that
 * `src/test-setup.ts` reads before any config module is imported (the config
 * modules capture DATABASE_URL/REDIS_URL at import time).
 *
 * Set SKIP_TESTCONTAINERS=true to reuse infrastructure you provide via
 * DATABASE_URL/REDIS_URL/RABBITMQ_URL instead of starting containers.
 */

import { execSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

const API_ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(API_ROOT, '..', '..');
const INFO_FILE = path.join(REPO_ROOT, 'node_modules', '.cache', 'vitest-infra.json');

interface InfraInfo {
  databaseUrl: string;
  redisUrl: string;
  rabbitmqUrl: string;
  containers: boolean;
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  const info = await startInfra();
  fs.mkdirSync(path.dirname(INFO_FILE), { recursive: true });
  fs.writeFileSync(INFO_FILE, JSON.stringify(info));

  if (info.containers) {
    runMigrations(info.databaseUrl);
  }

  return async () => {
    if (info.containers) {
      fs.rmSync(INFO_FILE, { force: true });
    }
    // Testcontainers' Ryuk sidecar reaps the containers automatically;
    // stop them eagerly so test runs don't linger on the host.
    // (Ryuk handles the error case where this process is killed.)
  };
}

async function startInfra(): Promise<InfraInfo> {
  if (process.env.SKIP_TESTCONTAINERS === 'true') {
    return {
      databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/freedomtalk',
      redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
      rabbitmqUrl: process.env.RABBITMQ_URL ?? 'amqp://rabbitmq:rabbitmq@localhost:5672',
      containers: false,
    };
  }

  const containers: StartedTestContainer[] = [];
  try {
    const postgres = await new GenericContainer('timescale/timescaledb:latest-pg16')
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'freedomtalk_test',
      })
      .withExposedPorts(5432)
      .withCommand(['postgres', '-c', 'shared_preload_libraries=timescaledb'])
      .withWaitStrategy(Wait.forListeningPorts())
      .start();
    containers.push(postgres);

    const redis = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();
    containers.push(redis);

    const rabbitmq = await new GenericContainer('rabbitmq:3-management-alpine')
      .withEnvironment({
        RABBITMQ_DEFAULT_USER: 'rabbitmq',
        RABBITMQ_DEFAULT_PASS: 'rabbitmq',
      })
      .withExposedPorts(5672, 15672)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();
    containers.push(rabbitmq);

    return {
      databaseUrl: `postgresql://test:test@${postgres.getHost()}:${postgres.getMappedPort(5432)}/freedomtalk_test`,
      redisUrl: `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
      rabbitmqUrl: `amqp://rabbitmq:rabbitmq@${rabbitmq.getHost()}:${rabbitmq.getMappedPort(5672)}`,
      containers: true,
    };
  } catch (error) {
    for (const c of containers) {
      await c.stop().catch(() => undefined);
    }
    throw new Error(
      'Failed to start test infrastructure containers. Is Docker running?\n' +
        '  (or set SKIP_TESTCONTAINERS=true and provide DATABASE_URL/REDIS_URL/RABBITMQ_URL)\n' +
        `Cause: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function runMigrations(databaseUrl: string): void {
  try {
    execSync('npx knex migrate:latest --knexfile knexfile.ts', {
      cwd: API_ROOT,
      stdio: 'inherit',
      // NODE_ENV=development because the knexfile only defines
      // development/staging/production environments (vitest sets NODE_ENV=test)
      env: { ...process.env, NODE_ENV: 'development', DATABASE_URL: databaseUrl },
      timeout: 120_000,
    });
  } catch (error) {
    throw new Error(`Database migrations failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
