/**
 * API Authentication Tests
 * Direct HTTP tests for auth endpoints
 */

import { test, expect } from '@playwright/test';
import { createTestUser } from '../utils/test-data';

const API_URL = process.env.API_BASE_URL || 'http://localhost:3001';

test.describe('Auth API', () => {
  test.describe('POST /api/v1/auth/register', () => {
    test('should register a new user', async ({ request }) => {
      const user = createTestUser();

      const response = await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: user.email,
          username: user.username,
          password: user.password,
          confirmPassword: user.password,
        },
      });

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.user.email).toBe(user.email);
    });

    test('should reject invalid email', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: 'invalid-email',
          username: 'testuser',
          password: 'Password123!',
          confirmPassword: 'Password123!',
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
          confirmPassword: 'weak',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject mismatched passwords', async ({ request }) => {
      const user = createTestUser();

      const response = await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: user.email,
          username: user.username,
          password: 'Password123!',
          confirmPassword: 'DifferentPassword123!',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject duplicate email', async ({ request }) => {
      const user = createTestUser();

      // First registration
      await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: user.email,
          username: user.username,
          password: user.password,
          confirmPassword: user.password,
        },
      });

      // Second registration with same email
      const response = await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: user.email,
          username: `different-${user.username}`,
          password: user.password,
          confirmPassword: user.password,
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

      await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: user.email,
          username: user.username,
          password: user.password,
          confirmPassword: user.password,
        },
      });
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
    });

    test('should reject invalid email', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/v1/auth/login`, {
        data: {
          email: 'nonexistent@example.com',
          password: 'Password123!',
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
      // First register
      const user = createTestUser();
      await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: user.email,
          username: user.username,
          password: user.password,
          confirmPassword: user.password,
        },
      });

      // Login to get session
      const loginResponse = await request.post(`${API_URL}/api/v1/auth/login`, {
        data: {
          email: user.email,
          password: user.password,
        },
      });

      // Get current user using cookies from login
      const meResponse = await request.get(`${API_URL}/api/v1/users/@me`, {
        headers: {
          Cookie: loginResponse.headers()['set-cookie'] || '',
        },
      });

      expect(meResponse.status()).toBe(200);
    });

    test('should return 401 when not authenticated', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/users/@me`);

      expect(response.status()).toBe(401);
    });
  });
});
