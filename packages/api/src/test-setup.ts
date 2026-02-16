/**
 * Test Setup
 * Global setup for Vitest tests
 */

import { beforeAll, afterAll } from 'vitest';
import { testConnection, closePool } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { generateKeyPairSync, randomBytes } from 'crypto';

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

// Connect to infrastructure before all tests
beforeAll(async () => {
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

