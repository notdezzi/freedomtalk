/**
 * Authentication Routes Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../../app';
import { FastifyInstance } from 'fastify';
import { db } from '../../config/database';
import { redisClient } from '../../config/redis';

describe('Authentication Routes', () => {
  let app: FastifyInstance;
  let testUserId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    app = await build({ skipRateLimit: true });
    await app.ready();
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await db('user_profiles').where({ user_id: testUserId }).del();
      await db('users').where({ id: testUserId }).del();
    }
    await app.close();
  });

  beforeEach(async () => {
    // Clear any existing test user
    await db('users').where({ email: 'test@example.com' }).del();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.userId).toBeDefined();
      expect(body.data.username).toBe('testuser');
      expect(body.data.email).toBe('test@example.com');

      testUserId = body.data.userId;

      // Verify user and profile were created atomically
      const user = await db('users').where({ id: testUserId }).first();
      expect(user).toBeDefined();
      const profile = await db('user_profiles').where({ user_id: testUserId }).first();
      expect(profile).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      // Create first user
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: 'testuser1',
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      });

      // Try to register with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: 'testuser2',
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CONFLICT');
    });

    it('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: 'testuser',
          email: 'invalid-email',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      });
      testUserId = JSON.parse(response.body).data.userId;
    });

    it('should login successfully with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.user.email).toBe('test@example.com');

      accessToken = body.data.accessToken;
      refreshToken = body.data.refreshToken;
    });

    it('should reject invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'WrongPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    beforeEach(async () => {
      // Create and login test user
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      testUserId = loginBody.data.user.id;
      refreshToken = loginBody.data.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refresh_token: refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.refreshToken).not.toBe(refreshToken); // Token rotation
    });

    it('should reject reused refresh token (token rotation)', async () => {
      // Use refresh token once
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refresh_token: refreshToken,
        },
      });

      // Try to use same token again
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refresh_token: refreshToken,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    beforeEach(async () => {
      // Create and login test user
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      testUserId = loginBody.data.user.id;
      refreshToken = loginBody.data.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: {
          refresh_token: refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toBe('Logged out successfully');
    });

    it('should blacklist refresh token after logout', async () => {
      // Logout
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: {
          refresh_token: refreshToken,
        },
      });

      // Try to use blacklisted token
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refresh_token: refreshToken,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

