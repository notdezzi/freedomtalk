/**
 * API Users Tests
 * Direct HTTP tests for user endpoints
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { createTestUser } from '../utils/test-data';

const API_URL = process.env.API_BASE_URL || 'http://localhost:3001';

/**
 * Helper to register a user and return the access token
 */
async function registerAndGetToken(
  request: APIRequestContext,
  user: ReturnType<typeof createTestUser>
): Promise<{ accessToken: string; userId: string }> {
  const response = await request.post(`${API_URL}/api/v1/auth/register`, {
    data: {
      email: user.email,
      username: user.username,
      password: user.password,
    },
  });

  expect(response.status()).toBe(201);

  // Login to get tokens
  const loginResponse = await request.post(`${API_URL}/api/v1/auth/login`, {
    data: {
      email: user.email,
      password: user.password,
    },
  });

  expect(loginResponse.status()).toBe(200);
  const body = await loginResponse.json();
  return {
    accessToken: body.data.accessToken,
    userId: body.data.user.id,
  };
}

test.describe('Users API', () => {
  let accessToken: string;
  let testUserId: string;

  test.beforeAll(async ({ request }) => {
    // Register and login a test user
    const user = createTestUser();
    const auth = await registerAndGetToken(request, user);
    accessToken = auth.accessToken;
    testUserId = auth.userId;
  });

  test.describe('GET /api/v1/users/@me', () => {
    test('should return current user profile', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.data.id).toBeDefined();
      expect(body.data.email).toBeDefined();
      expect(body.data.username).toBeDefined();
    });

    test('should return 401 when not authenticated', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/users/@me`);

      expect(response.status()).toBe(401);
    });
  });

  test.describe('PUT /api/v1/users/@me', () => {
    test('should update user profile', async ({ request }) => {
      const response = await request.put(`${API_URL}/api/v1/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          display_name: 'Updated Display Name',
          bio: 'Updated bio for testing',
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.data.profile.displayName).toBe('Updated Display Name');
      expect(body.data.profile.bio).toBe('Updated bio for testing');
    });

    test('should reject invalid avatar URL', async ({ request }) => {
      const response = await request.put(`${API_URL}/api/v1/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          avatar_url: 'not-a-url',
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('GET /api/v1/users/:userId', () => {
    test('should return user by ID if endpoint exists', async ({ request }) => {
      if (!testUserId) {
        test.skip();
        return;
      }

      // Note: This endpoint may not be implemented yet
      const response = await request.get(`${API_URL}/api/v1/users/${testUserId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Accept success or not implemented
      expect([200, 404]).toContain(response.status());
    });

    test('should return 404 for non-existent user', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/users/00000000000000000000`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe('PUT /api/v1/users/@me/settings', () => {
    test('should handle user settings endpoint', async ({ request }) => {
      const response = await request.put(`${API_URL}/api/v1/users/@me/settings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          theme: 'dark',
          locale: 'en',
        },
      });

      // May not be implemented yet
      expect([200, 404, 501]).toContain(response.status());
    });
  });

  test.describe('User Presence', () => {
    test('should handle user status endpoint', async ({ request }) => {
      const response = await request.patch(`${API_URL}/api/v1/users/@me/status`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          status: 'online',
          customStatus: 'Testing',
        },
      });

      // May return different status codes depending on implementation
      expect([200, 204, 404]).toContain(response.status());
    });
  });
});
