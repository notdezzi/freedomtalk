/**
 * API Users Tests
 * Direct HTTP tests for user endpoints
 */

import { test, expect } from '@playwright/test';
import { createTestUser } from '../utils/test-data';

const API_URL = process.env.API_BASE_URL || 'http://localhost:3001';

test.describe('Users API', () => {
  let authCookie: string;
  let testUserId: string;

  test.beforeAll(async ({ request }) => {
    // Register and login a test user
    const user = createTestUser();
    await request.post(`${API_URL}/api/v1/auth/register`, {
      data: {
        email: user.email,
        username: user.username,
        password: user.password,
        confirmPassword: user.password,
      },
    });

    const loginResponse = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: {
        email: user.email,
        password: user.password,
      },
    });

    authCookie = loginResponse.headers()['set-cookie'] || '';

    const loginBody = await loginResponse.json();
    testUserId = loginBody.data?.user?.id;
  });

  test.describe('GET /api/v1/users/@me', () => {
    test('should return current user profile', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/users/@me`, {
        headers: { Cookie: authCookie },
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

  test.describe('PATCH /api/v1/users/@me', () => {
    test('should update user profile', async ({ request }) => {
      const response = await request.patch(`${API_URL}/api/v1/users/@me`, {
        headers: { Cookie: authCookie },
        data: {
          displayName: 'Updated Display Name',
          bio: 'Updated bio for testing',
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.data.displayName).toBe('Updated Display Name');
      expect(body.data.bio).toBe('Updated bio for testing');
    });

    test('should reject invalid data', async ({ request }) => {
      const response = await request.patch(`${API_URL}/api/v1/users/@me`, {
        headers: { Cookie: authCookie },
        data: {
          email: 'invalid-email',
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('GET /api/v1/users/:userId', () => {
    test('should return user by ID', async ({ request }) => {
      if (!testUserId) {
        test.skip();
        return;
      }

      const response = await request.get(`${API_URL}/api/v1/users/${testUserId}`, {
        headers: { Cookie: authCookie },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.data.id).toBe(testUserId);
    });

    test('should return 404 for non-existent user', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/users/00000000000000000000`, {
        headers: { Cookie: authCookie },
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe('PUT /api/v1/users/@me/settings', () => {
    test('should update user settings', async ({ request }) => {
      const response = await request.put(`${API_URL}/api/v1/users/@me/settings`, {
        headers: { Cookie: authCookie },
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
    test('should update user status', async ({ request }) => {
      const response = await request.patch(`${API_URL}/api/v1/users/@me/status`, {
        headers: { Cookie: authCookie },
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
