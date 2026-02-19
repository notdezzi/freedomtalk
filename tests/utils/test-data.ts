/**
 * Test data generators and helpers
 */

export interface TestUser {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface TestServer {
  name: string;
  description?: string;
}

export interface TestChannel {
  name: string;
  type: 'text' | 'voice' | 'announcement';
  topic?: string;
}

let userCounter = 0;
let serverCounter = 0;
let channelCounter = 0;

/**
 * Reset all counters (for use between test runs)
 */
export function resetTestDataCounters(): void {
  userCounter = 0;
  serverCounter = 0;
  channelCounter = 0;
}

/**
 * Generate a unique test user
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  userCounter++;
  // Use random string for better uniqueness
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now();
  const uniqueId = `${timestamp}_${userCounter}_${randomPart}`;

  return {
    email: `test_${uniqueId}@example.com`,
    username: `testuser_${randomPart}`, // Keep short and simple
    password: 'TestPassword123!',
    displayName: `Test User ${userCounter}`,
    ...overrides,
  };
}

/**
 * Generate a unique test server
 */
export function createTestServer(overrides: Partial<TestServer> = {}): TestServer {
  serverCounter++;
  const timestamp = Date.now();

  return {
    name: `Test Server ${timestamp}-${serverCounter}`,
    description: `A test server created at ${new Date().toISOString()}`,
    ...overrides,
  };
}

/**
 * Generate a unique test channel
 */
export function createTestChannel(
  type: 'text' | 'voice' | 'announcement' = 'text',
  overrides: Partial<TestChannel> = {}
): TestChannel {
  channelCounter++;
  const timestamp = Date.now();

  return {
    name: `test-channel-${timestamp}-${channelCounter}`,
    type,
    topic: `Test channel for ${type} messages`,
    ...overrides,
  };
}

/**
 * Generate a random string
 */
export function randomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Generate test message content
 */
export function createTestMessage(): string {
  return `Test message ${randomString()} at ${new Date().toISOString()}`;
}

/**
 * Wait helper
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
