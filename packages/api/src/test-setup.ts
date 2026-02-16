/**
 * Test Setup
 * Global setup for Vitest tests
 */

import { beforeAll, afterAll } from 'vitest';
import { testConnection, closePool } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';

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

