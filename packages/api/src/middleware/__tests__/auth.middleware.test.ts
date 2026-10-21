/**
 * Auth Middleware Integration Tests
 * Exercises requireAuth / optionalAuth through a minimal Fastify app
 * against real Postgres, Redis and JWT services (Testcontainers infra).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import { requireAuth, optionalAuth } from '../auth.middleware';
import { db } from '../../config/database';
import { jwtService } from '../../services/auth/jwt.service';
import { sessionService } from '../../services/auth/session.service';

const USER_ID = '9999980000000000001';
const MFA_USER_ID = '9999980000000000002';

function buildTestApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(cookie);

  app.get('/protected', { preHandler: requireAuth }, async (request) => ({
    userId: request.user?.id,
    sessionId: request.sessionId,
  }));

  app.get('/optional', { preHandler: optionalAuth }, async (request) => ({
    userId: request.user?.id ?? null,
  }));

  return app;
}

describe('auth.middleware (integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();

    await db('users').insert([
      {
        id: USER_ID,
        username: 'auth-test-user',
        email: 'auth-test-user@test.com',
        password_hash: 'test-hash',
        email_verified: true,
        mfa_enabled: false,
        account_status: 'active',
      },
      {
        id: MFA_USER_ID,
        username: 'auth-test-mfa',
        email: 'auth-test-mfa@test.com',
        password_hash: 'test-hash',
        email_verified: true,
        mfa_enabled: true,
        account_status: 'active',
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
    await db('users').whereIn('id', [USER_ID, MFA_USER_ID]).del();
  });

  describe('requireAuth', () => {
    it('accepts a valid Bearer token and attaches the user', async () => {
      const token = jwtService.generateAccessToken(USER_ID, { username: 'auth-test-user' });
      const res = await app.inject({ method: 'GET', url: '/protected', headers: { authorization: `Bearer ${token}` } });
      expect(res.statusCode).toBe(200);
      expect(res.json().userId).toBe(USER_ID);
    });

    it('accepts the token from the access_token cookie', async () => {
      const token = jwtService.generateAccessToken(USER_ID, { username: 'auth-test-user' });
      const res = await app.inject({ method: 'GET', url: '/protected', cookies: { access_token: token } });
      expect(res.statusCode).toBe(200);
      expect(res.json().userId).toBe(USER_ID);
    });

    it('rejects a missing token with 401', async () => {
      const res = await app.inject({ method: 'GET', url: '/protected' });
      expect(res.statusCode).toBe(401);
    });

    it('rejects a malformed token with 401', async () => {
      const res = await app.inject({ method: 'GET', url: '/protected', headers: { authorization: 'Bearer garbage' } });
      expect(res.statusCode).toBe(401);
    });

    it('rejects a token signed with the wrong key with 401', async () => {
      // Token with a tampered signature section
      const token = jwtService.generateAccessToken(USER_ID, { username: 'auth-test-user' });
      const tampered = token.slice(0, -4) + 'AAAA';
      const res = await app.inject({ method: 'GET', url: '/protected', headers: { authorization: `Bearer ${tampered}` } });
      expect(res.statusCode).toBe(401);
    });

    it('rejects a token for a user that no longer exists with 401', async () => {
      const token = jwtService.generateAccessToken('9999989999999999999', { username: 'ghost' });
      const res = await app.inject({ method: 'GET', url: '/protected', headers: { authorization: `Bearer ${token}` } });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).error.message).toBe('User not found');
    });

    it('rejects a banned account with 401', async () => {
      const bannedId = '9999980000000000003';
      await db('users').insert({
        id: bannedId,
        username: 'auth-test-banned',
        email: 'auth-test-banned@test.com',
        password_hash: 'test-hash',
        email_verified: true,
        mfa_enabled: false,
        account_status: 'suspended',
      });
      try {
        const token = jwtService.generateAccessToken(bannedId, { username: 'auth-test-banned' });
        const res = await app.inject({ method: 'GET', url: '/protected', headers: { authorization: `Bearer ${token}` } });
        expect(res.statusCode).toBe(401);
        expect(JSON.parse(res.body).error.message).toBe('Account is not active');
      } finally {
        await db('users').where('id', bannedId).del();
      }
    });

    it('rejects an MFA-enabled user whose token carries no sessionId', async () => {
      const token = jwtService.generateAccessToken(MFA_USER_ID, { username: 'auth-test-mfa' });
      const res = await app.inject({ method: 'GET', url: '/protected', headers: { authorization: `Bearer ${token}` } });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).error.message).toBe('MFA verification required');
    });

    it('rejects an MFA-enabled user with an unverified session', async () => {
      const sessionId = await sessionService.createSession(MFA_USER_ID, { mfaVerified: false });
      const token = jwtService.generateAccessToken(MFA_USER_ID, { username: 'auth-test-mfa', sessionId });
      const res = await app.inject({ method: 'GET', url: '/protected', headers: { authorization: `Bearer ${token}` } });
      expect(res.statusCode).toBe(401);
    });

    it('accepts an MFA-enabled user with a verified session and attaches the sessionId', async () => {
      const sessionId = await sessionService.createSession(MFA_USER_ID, { mfaVerified: true });
      const token = jwtService.generateAccessToken(MFA_USER_ID, { username: 'auth-test-mfa', sessionId });
      const res = await app.inject({ method: 'GET', url: '/protected', headers: { authorization: `Bearer ${token}` } });
      expect(res.statusCode).toBe(200);
      expect(res.json().sessionId).toBe(sessionId);
    });
  });

  describe('optionalAuth', () => {
    it('attaches the user when a valid token is present', async () => {
      const token = jwtService.generateAccessToken(USER_ID, { username: 'auth-test-user' });
      const res = await app.inject({ method: 'GET', url: '/optional', headers: { authorization: `Bearer ${token}` } });
      expect(res.statusCode).toBe(200);
      expect(res.json().userId).toBe(USER_ID);
    });

    it('continues without a user when no token is present', async () => {
      const res = await app.inject({ method: 'GET', url: '/optional' });
      expect(res.statusCode).toBe(200);
      expect(res.json().userId).toBeNull();
    });

    it('continues without a user on an invalid token', async () => {
      const res = await app.inject({ method: 'GET', url: '/optional', headers: { authorization: 'Bearer garbage' } });
      expect(res.statusCode).toBe(200);
      expect(res.json().userId).toBeNull();
    });

    it('continues without a user when the account is inactive', async () => {
      const bannedId = '9999980000000000004';
      await db('users').insert({
        id: bannedId,
        username: 'auth-test-banned2',
        email: 'auth-test-banned2@test.com',
        password_hash: 'test-hash',
        email_verified: true,
        mfa_enabled: false,
        account_status: 'suspended',
      });
      try {
        const token = jwtService.generateAccessToken(bannedId, { username: 'auth-test-banned2' });
        const res = await app.inject({ method: 'GET', url: '/optional', headers: { authorization: `Bearer ${token}` } });
        expect(res.statusCode).toBe(200);
        expect(res.json().userId).toBeNull();
      } finally {
        await db('users').where('id', bannedId).del();
      }
    });
  });
});
