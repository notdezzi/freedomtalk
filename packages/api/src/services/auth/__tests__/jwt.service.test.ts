/**
 * JWT Service Tests
 * 
 * Tests for JWT token generation, verification, and blacklisting.
 * 
 * NOTE: These tests require JWT_PRIVATE_KEY and JWT_PUBLIC_KEY to be set in environment.
 * Run tests with proper environment configuration.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { jwtService } from '../jwt.service';
import { redisClient } from '../../../config/redis';

describe('JWTService', () => {
  const testUserId = '1234567890';
  const testSessionId = '9876543210';

  afterAll(async () => {
    // Cleanup Redis connections
    await redisClient.quit();
  });

  describe('generateAccessToken', () => {
    it('should generate access token', () => {
      const token = jwtService.generateAccessToken(testUserId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include userId in token payload', async () => {
      const token = jwtService.generateAccessToken(testUserId);
      const payload = await jwtService.verifyToken(token);

      expect(payload.userId).toBe(testUserId);
      expect(payload.type).toBe('access');
    });

    it('should include additional payload data', async () => {
      const additionalData = { role: 'admin', permissions: ['read', 'write'] };
      const token = jwtService.generateAccessToken(testUserId, additionalData);
      const payload = await jwtService.verifyToken(token);

      expect(payload.role).toBe('admin');
      expect(payload.permissions).toEqual(['read', 'write']);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token', () => {
      const token = jwtService.generateRefreshToken(testUserId, testSessionId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include userId and sessionId in token payload', async () => {
      const token = jwtService.generateRefreshToken(testUserId, testSessionId);
      const payload = await jwtService.verifyToken(token);

      expect(payload.userId).toBe(testUserId);
      expect(payload.sessionId).toBe(testSessionId);
      expect(payload.type).toBe('refresh');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const token = jwtService.generateAccessToken(testUserId);
      const payload = await jwtService.verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(testUserId);
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(jwtService.verifyToken(invalidToken)).rejects.toThrow('Invalid token');
    });

    it('should reject blacklisted token', async () => {
      const token = jwtService.generateAccessToken(testUserId);
      
      // Blacklist the token
      await jwtService.blacklistToken(token);

      // Try to verify blacklisted token
      await expect(jwtService.verifyToken(token)).rejects.toThrow('Token has been revoked');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = jwtService.generateAccessToken(testUserId);
      const payload = jwtService.decodeToken(token);

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testUserId);
    });

    it('should return null for invalid token', () => {
      const payload = jwtService.decodeToken('invalid.token');

      expect(payload).toBeNull();
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist token', async () => {
      const token = jwtService.generateAccessToken(testUserId);
      
      await jwtService.blacklistToken(token);
      
      const isBlacklisted = await jwtService.isBlacklisted(token);
      expect(isBlacklisted).toBe(true);
    });
  });

  describe('isBlacklisted', () => {
    it('should return false for non-blacklisted token', async () => {
      const token = jwtService.generateAccessToken(testUserId);
      const isBlacklisted = await jwtService.isBlacklisted(token);

      expect(isBlacklisted).toBe(false);
    });

    it('should return true for blacklisted token', async () => {
      const token = jwtService.generateAccessToken(testUserId);
      await jwtService.blacklistToken(token);
      const isBlacklisted = await jwtService.isBlacklisted(token);

      expect(isBlacklisted).toBe(true);
    });
  });
});

