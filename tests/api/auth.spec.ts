/**
 * API Authentication Tests
 * Direct HTTP tests for auth endpoints
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
): Promise<{ accessToken: string; refreshToken: string; user: any }> {
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
    refreshToken: body.data.refreshToken,
    user: body.data.user,
  };
}

test.describe('Auth API', () => {
  test.describe('POST /api/v1/auth/register', () => {
    test('should register a new user', async ({ request }) => {
      const user = createTestUser();

      const response = await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: user.email,
          username: user.username,
          password: user.password,
        },
      });

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.email).toBe(user.email);
    });

    test('should reject invalid email', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: 'invalid-email',
          username: 'testuser',
          password: 'TestPassword123!',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject weak password', async ({ request }) => {
      const user = createTestUser();

      const response = await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: user.email,
          username: user.username,
          password: 'weak',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject duplicate email', async ({ request }) => {
      const user = createTestUser();

      // First registration
      const firstResponse = await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: user.email,
          username: user.username,
          password: user.password,
        },
      });
      expect(firstResponse.status()).toBe(201);

      // Second registration with same email but different username
      const response = await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: user.email,
          username: `diff_${user.username}`, // Use underscore instead of hyphen
          password: user.password,
        },
      });

      expect(response.status()).toBe(409);
    });
  });

  test.describe('POST /api/v1/auth/login', () => {
    let testUserEmail: string;
    let testUserPassword: string;

    test.beforeAll(async ({ request }) => {
      const user = createTestUser();
      testUserEmail = user.email;
      testUserPassword = user.password;

      const response = await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: user.email,
          username: user.username,
          password: user.password,
        },
      });
      expect(response.status()).toBe(201);
    });

    test('should login with valid credentials', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/v1/auth/login`, {
        data: {
          email: testUserEmail,
          password: testUserPassword,
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.user).toBeDefined();
      expect(body.data.accessToken).toBeDefined();
    });

    test('should reject invalid email', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/v1/auth/login`, {
        data: {
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        },
      });

      expect(response.status()).toBe(401);
    });

    test('should reject wrong password', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/v1/auth/login`, {
        data: {
          email: testUserEmail,
          password: 'WrongPassword123!',
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('GET /api/v1/users/@me', () => {
    test('should return current user when authenticated', async ({ request }) => {
      const user = createTestUser();
      const { accessToken } = await registerAndGetToken(request, user);

      // Get current user using Bearer token
      const meResponse = await request.get(`${API_URL}/api/v1/users/@me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(meResponse.status()).toBe(200);

      const body = await meResponse.json();
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(user.email);
    });

    test('should return 401 when not authenticated', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/users/@me`);

      expect(response.status()).toBe(401);
    });

    test('should return 401 with invalid token', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/users/@me`, {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('POST /api/v1/auth/refresh', () => {
    test('should refresh tokens with valid refresh token', async ({ request }) => {
      const user = createTestUser();
      const { refreshToken } = await registerAndGetToken(request, user);

      const response = await request.post(`${API_URL}/api/v1/auth/refresh`, {
        data: {
          refresh_token: refreshToken,
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      // New tokens should be different
      expect(body.data.refreshToken).not.toBe(refreshToken);
    });

    test('should reject invalid refresh token', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/v1/auth/refresh`, {
        data: {
          refresh_token: 'invalid-token',
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('POST /api/v1/auth/logout', () => {
    test('should logout successfully', async ({ request }) => {
      const user = createTestUser();
      const { accessToken, refreshToken } = await registerAndGetToken(request, user);

      const response = await request.post(`${API_URL}/api/v1/auth/logout`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          refresh_token: refreshToken,
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });
});
