/**
 * Email Verification Service
 * 
 * Provides email verification functionality with token generation,
 * validation, rate limiting, and security logging.
 */

import crypto from 'crypto';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { emailService } from '../email/email.service';

/**
 * Email verification service class
 */
class EmailVerificationService {
  private readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly MAX_SENDS_PER_WINDOW = 3;

  /**
   * Send verification email to user
   * @param userId - User ID
   * @param ipAddress - Request IP address for security logging
   * @returns Success status
   */
  async sendVerificationEmail(userId: string, ipAddress?: string): Promise<boolean> {
    try {
      // Get user
      const user = await db('users').where({ id: userId }).first();
      
      if (!user) {
        logger.error({ userId }, 'User not found for email verification');
        return false;
      }

      // Check if already verified
      if (user.email_verified) {
        logger.info({ userId }, 'Email already verified');
        return true;
      }

      // Check rate limiting by comparing against the last send time stored
      // on the user row (single-row storage can only ever count to 1, so a
      // count-based window never fires — this per-send spacing check does).
      if (user.verification_token_expires) {
        const lastSent = new Date(user.verification_token_expires).getTime() - this.TOKEN_EXPIRY;
        const minResendInterval = this.RATE_LIMIT_WINDOW / this.MAX_SENDS_PER_WINDOW;
        if (Date.now() - lastSent < minResendInterval) {
          logger.warn({ userId, ipAddress }, 'Email verification rate limit exceeded');
          return false;
        }
      }

      // Generate verification token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY);

      // Store the token HASHED (the route-level resend limiter still applies;
      // a DB leak must not yield usable verification tokens).
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await db('users')
        .where({ id: userId })
        .update({
          verification_token: tokenHash,
          verification_token_expires: expiresAt,
          updated_at: new Date(),
        });

      // Generate verification link
      const verificationLink = `${process.env.WEB_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;

      // Send verification email
      await emailService.sendVerificationEmail(user.email, verificationLink);

      // SECURITY LOGGING: Verification email sent
      logger.info({ userId, email: user.email, ipAddress }, 'Verification email sent');

      return true;
    } catch (error) {
      logger.error({ error, userId, ipAddress }, 'Error sending verification email');
      return false;
    }
  }

  /**
   * Verify email using token
   * @param token - Verification token
   * @param ipAddress - Request IP address for security logging
   * @returns Success status
   */
  async verifyEmail(token: string, ipAddress?: string): Promise<boolean> {
    try {
      // Hash the incoming token to compare with the stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid token
      const user = await db('users')
        .where({ verification_token: tokenHash })
        .where('verification_token_expires', '>', new Date())
        .first();

      if (!user) {
        // SECURITY LOGGING: Failed verification attempt
        logger.warn({ ipAddress, reason: 'Invalid or expired token' }, 'Failed email verification attempt');
        return false;
      }

      // Check if already verified
      if (user.email_verified) {
        logger.info({ userId: user.id }, 'Email already verified');
        return true;
      }

      // Mark email as verified and clear token
      await db('users')
        .where({ id: user.id })
        .update({
          email_verified: true,
          verification_token: null,
          verification_token_expires: null,
          updated_at: new Date(),
        });

      // SECURITY LOGGING: Successful email verification
      logger.info({ userId: user.id, email: user.email, ipAddress }, 'Email verified successfully');

      return true;
    } catch (error) {
      logger.error({ error, ipAddress }, 'Error verifying email');
      return false;
    }
  }

  /**
   * Resend verification email
   * @param userId - User ID
   * @param ipAddress - Request IP address for security logging
   * @returns Success status
   */
  async resendVerificationEmail(userId: string, ipAddress?: string): Promise<boolean> {
    return this.sendVerificationEmail(userId, ipAddress);
  }

  /**
   * Cleanup expired verification tokens
   * Should be called by a scheduled job (e.g., cron)
   * @returns Number of cleaned tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await db('users')
        .where('verification_token_expires', '<', new Date())
        .whereNotNull('verification_token')
        .update({
          verification_token: null,
          verification_token_expires: null,
          updated_at: new Date(),
        });

      if (result > 0) {
        logger.info({ count: result }, 'Cleaned up expired verification tokens');
      }

      return result;
    } catch (error) {
      logger.error({ error }, 'Error cleaning up expired verification tokens');
      return 0;
    }
  }
}

/**
 * Email verification service singleton
 * Use this instance throughout the application
 */
export const emailVerificationService = new EmailVerificationService();

