/**
 * Test Setup
 * Global setup for Vitest tests
 *
 * Infrastructure URLs are provisioned by `vitest.global-setup.ts` (Testcontainers)
 * and written to node_modules/.cache/vitest-infra.json. They must be applied to
 * process.env here — BEFORE any config module is imported — because
 * `config/database.ts` and `config/redis.ts` capture the URLs at import time.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKeyPairSync, randomBytes } from 'crypto';
import { beforeAll, afterAll } from 'vitest';

const INFO_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', // src -> packages/api
  '..', // packages/api -> packages
  '..', // packages -> repo root
  'node_modules',
  '.cache',
  'vitest-infra.json'
);

// Apply infrastructure URLs before anything imports the config modules
if (fs.existsSync(INFO_FILE)) {
  const info = JSON.parse(fs.readFileSync(INFO_FILE, 'utf8'));
  process.env.DATABASE_URL = info.databaseUrl;
  process.env.REDIS_URL = info.redisUrl;
  process.env.RABBITMQ_URL = info.rabbitmqUrl;
}

// Generate RSA key pair for JWT tests if not already set
if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  process.env.JWT_PRIVATE_KEY = privateKey;
  process.env.JWT_PUBLIC_KEY = publicKey;
}

// Generate SESSION_ENCRYPTION_KEY for session tests if not already set
if (!process.env.SESSION_ENCRYPTION_KEY) {
  process.env.SESSION_ENCRYPTION_KEY = randomBytes(32).toString('hex');
}

// MinIOService validates credentials at import time; give it dummies so
// suites that transitively import it don't crash when .env is absent.
// No real object-storage calls happen in unit/integration tests.
process.env.MINIO_ACCESS_KEY ??= 'minioadmin';
process.env.MINIO_SECRET_KEY ??= 'minioadmin';
process.env.MINIO_BUCKET ??= 'attachments';
process.env.MINIO_ENDPOINT ??= 'localhost';
process.env.MINIO_PORT ??= '9000';

// Connect to infrastructure before all tests.
// Imported dynamically so the env vars above are in place first. Some suites
// vi.mock() config/database or config/redis; accessing an unmocked export on
// such a mock throws, so fall back to no-ops — a suite that mocks its
// infrastructure manages connections itself.
let testConnection: () => Promise<boolean> = async () => true;
let closePool: () => Promise<void> = async () => undefined;
let connectRedis: () => Promise<void> = async () => undefined;
let disconnectRedis: () => Promise<void> = async () => undefined;

beforeAll(async () => {
  try {
    const database = await import('./config/database');
    testConnection = database.testConnection;
    closePool = database.closePool;
  } catch {
    // config/database is mocked by this suite
  }
  try {
    const redis = await import('./config/redis');
    connectRedis = redis.connectRedis;
    disconnectRedis = redis.disconnectRedis;
  } catch {
    // config/redis is mocked by this suite
  }

  try {
    await testConnection();
    await connectRedis();
  } catch (error) {
    console.error('Failed to connect to infrastructure:', error);
    throw error;
  }
});

// Disconnect from infrastructure after all tests
afterAll(async () => {
  try {
    await disconnectRedis();
    await closePool();
  } catch (error) {
    console.error('Failed to disconnect from infrastructure:', error);
  }
});
