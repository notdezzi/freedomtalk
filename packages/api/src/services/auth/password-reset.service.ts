/**
 * Password Reset Service
 * 
 * Provides secure password reset functionality with token generation,
 * validation, rate limiting, and security logging.
 */

import crypto from 'crypto';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { emailService } from '../email/email.service';
import { passwordService } from './password.service';

/**
 * Password reset request result
 */
export interface PasswordResetRequestResult {
  success: boolean;
  message: string;
}

/**
 * Password reset service class
 */
class PasswordResetService {
  private readonly TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly MAX_REQUESTS_PER_WINDOW = 3;

  /**
   * Request password reset
   * Generates token, stores in database, and sends email
   * @param email - User email
   * @param ipAddress - Request IP address for security logging
   * @returns Result indicating success (always returns success to prevent email enumeration)
   */
  async requestPasswordReset(email: string, ipAddress?: string): Promise<PasswordResetRequestResult> {
    try {
      // Find user by email
      const user = await db('users').where({ email }).first();

      // SECURITY: Always return success to prevent email enumeration
      if (!user) {
        logger.info({ email, ipAddress }, 'Password reset requested for non-existent email');
        return {
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        };
      }

      // Check rate limiting
      const recentRequests = await db('password_resets')
        .where({ user_id: user.id })
        .where('created_at', '>', new Date(Date.now() - this.RATE_LIMIT_WINDOW))
        .count('* as count')
        .first();

      if (recentRequests && Number(recentRequests.count) >= this.MAX_REQUESTS_PER_WINDOW) {
        // SECURITY LOGGING: Rate limit exceeded
        logger.warn({ userId: user.id, email, ipAddress }, 'Password reset rate limit exceeded');
        
        // Still return success to prevent enumeration
        return {
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        };
      }

      // Generate secure reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY);

      // Store token in database
      await db('password_resets').insert({
        user_id: user.id,
        token,
        expires_at: expiresAt,
        created_at: new Date(),
      });

      // Generate reset link
      const resetLink = `${process.env.WEB_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

      // Send reset email
      await emailService.sendPasswordResetEmail(user.email, resetLink);

      // SECURITY LOGGING: Password reset requested
      logger.info({ userId: user.id, email, ipAddress }, 'Password reset requested');

      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    } catch (error) {
      logger.error({ error, email, ipAddress }, 'Error requesting password reset');
      
      // Return generic success to prevent information leakage
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }
  }

  /**
   * Validate reset token
   * @param token - Reset token
   * @returns User ID if valid, null otherwise
   */
  async validateResetToken(token: string): Promise<string | null> {
    try {
      const resetRecord = await db('password_resets')
        .where({ token })
        .where('expires_at', '>', new Date())
        .where('used_at', null)
        .first();

      if (!resetRecord) {
        return null;
      }

      return resetRecord.user_id;
    } catch (error) {
      logger.error({ error }, 'Error validating reset token');
      return null;
    }
  }

  /**
   * Reset password using token
   * @param token - Reset token
   * @param newPassword - New password
   * @param ipAddress - Request IP address for security logging
   * @returns Success status
   */
  async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<boolean> {
    try {
      // Validate token using timing-safe comparison
      const userId = await this.validateResetToken(token);
      
      if (!userId) {
        // SECURITY LOGGING: Failed password reset attempt
        logger.warn({ ipAddress, reason: 'Invalid or expired token' }, 'Failed password reset attempt');
        return false;
      }

      // Validate password strength
      const validation = passwordService.validatePasswordStrength(newPassword);
      if (!validation.valid) {
        // SECURITY LOGGING: Failed password reset attempt
        logger.warn({ userId, ipAddress, reason: 'Weak password', errors: validation.errors }, 'Failed password reset attempt');
        return false;
      }

      // Hash new password
      const passwordHash = await passwordService.hashPassword(newPassword);

      // Update user password
      await db('users')
        .where({ id: userId })
        .update({
          password_hash: passwordHash,
          updated_at: new Date(),
        });

      // Mark token as used
      await db('password_resets')
        .where({ token })
        .update({
          used_at: new Date(),
        });

      // SECURITY LOGGING: Successful password reset
      logger.info({ userId, ipAddress }, 'Password reset successful');

      return true;
    } catch (error) {
      logger.error({ error, ipAddress }, 'Error resetting password');
      return false;
    }
  }

  /**
   * Cleanup expired password reset tokens
   * Should be called by a scheduled job (e.g., cron)
   * @returns Number of deleted tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const deleted = await db('password_resets')
        .where('expires_at', '<', new Date())
        .orWhereNotNull('used_at')
        .delete();

      if (deleted > 0) {
        logger.info({ count: deleted }, 'Cleaned up expired password reset tokens');
      }

      return deleted;
    } catch (error) {
      logger.error({ error }, 'Error cleaning up expired tokens');
      return 0;
    }
  }
}

/**
 * Password reset service singleton
 * Use this instance throughout the application
 */
export const passwordResetService = new PasswordResetService();

