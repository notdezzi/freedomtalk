/**
 * JWT Token Service
 *
 * Provides JWT token generation and verification using RS256 algorithm.
 * Uses asymmetric cryptography (public/private key pairs) for enhanced security.
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { AuthenticationError, ApiErrorCode } from '../../types/api.types';
import { generateSnowflakeId } from '../../utils/snowflake';

/**
 * JWT payload interface
 */
export interface JWTPayload {
  userId: string;
  sessionId?: string;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

/**
 * JWT service class
 */
class JWTService {
  private privateKey: string;
  private publicKey: string;

  constructor() {
    // CRITICAL: Fail if keys are not set in environment
    this.privateKey = process.env.JWT_PRIVATE_KEY || '';
    this.publicKey = process.env.JWT_PUBLIC_KEY || '';

    if (!this.privateKey || !this.publicKey) {
      const error = 'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set in environment variables. Generate keys using: node -e "const crypto = require(\'crypto\'); const { publicKey, privateKey } = crypto.generateKeyPairSync(\'rsa\', { modulusLength: 2048, publicKeyEncoding: { type: \'spki\', format: \'pem\' }, privateKeyEncoding: { type: \'pkcs8\', format: \'pem\' } }); console.log(\'Private Key:\\n\', privateKey); console.log(\'\\nPublic Key:\\n\', publicKey);"';
      logger.error(error);
      throw new Error(error);
    }

    // Replace escaped newlines with actual newlines
    this.privateKey = this.privateKey.replace(/\\n/g, '\n');
    this.publicKey = this.publicKey.replace(/\\n/g, '\n');

    logger.info('JWT service initialized with RS256 algorithm');
  }

  /**
   * Generate access token (15 minute expiry)
   * @param userId - User ID to include in token
   * @param additionalPayload - Additional data to include in token
   * @returns JWT access token
   */
  generateAccessToken(userId: string, additionalPayload?: object): string {
    const payload: JWTPayload = {
      userId,
      type: 'access',
      jti: generateSnowflakeId(), // Unique token ID for token rotation security
      ...additionalPayload,
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as string,
    } as SignOptions);
  }

  /**
   * Generate refresh token (7 day expiry)
   * @param userId - User ID to include in token
   * @param sessionId - Session ID to include in token
   * @returns JWT refresh token
   */
  generateRefreshToken(userId: string, sessionId: string): string {
    const payload: JWTPayload = {
      userId,
      sessionId,
      type: 'refresh',
      jti: generateSnowflakeId(), // Unique token ID for token rotation security
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as string,
    } as SignOptions);
  }

  /**
   * Verify and decode JWT token
   * @param token - JWT token to verify
   * @returns Decoded token payload
   * @throws AuthenticationError if token is invalid, expired, or blacklisted
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isBlacklisted(token);
      if (isBlacklisted) {
        throw new AuthenticationError('Token has been revoked', ApiErrorCode.TOKEN_REVOKED);
      }

      // Verify token signature and expiration
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        clockTolerance: 30, // 30 second tolerance for clock skew
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token has expired', ApiErrorCode.TOKEN_EXPIRED);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token', ApiErrorCode.TOKEN_INVALID);
      }
      throw error;
    }
  }

  /**
   * Decode token without verification (useful for extracting exp for blacklisting)
   * @param token - JWT token to decode
   * @returns Decoded payload or null if invalid
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Blacklist a token (add to Redis with TTL based on expiration)
   * @param token - Token to blacklist
   */
  async blacklistToken(token: string): Promise<void> {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      logger.warn('Cannot blacklist token: invalid or missing expiration');
      return;
    }

    // Calculate TTL (time until token expires)
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;

    if (ttl > 0) {
      const redis = await getRedisClient();
      await redis.setEx(`blacklist:${token}`, ttl, '1');
      logger.info({ userId: decoded.userId }, 'Token blacklisted');
    }
  }

  /**
   * Check if token is blacklisted
   * @param token - Token to check
   * @returns True if blacklisted, false otherwise
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const redis = await getRedisClient();
    const result = await redis.get(`blacklist:${token}`);
    return result !== null;
  }
}

/**
 * JWT service singleton
 * Use this instance throughout the application
 */
export const jwtService = new JWTService();

