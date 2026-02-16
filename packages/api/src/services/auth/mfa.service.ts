/**
 * Multi-Factor Authentication (MFA) Service
 * 
 * Provides TOTP-based MFA functionality with backup codes.
 * Uses speakeasy for TOTP generation and verification.
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { passwordService } from './password.service';

/**
 * MFA setup result
 */
export interface MFASetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

/**
 * MFA service class
 */
class MFAService {
  private readonly APP_NAME = 'FreedomTalk';
  private readonly BACKUP_CODE_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 8;

  /**
   * Generate MFA secret for user
   * @param userId - User ID
   * @param email - User email for QR code label
   * @returns MFA setup result with secret, QR code, and backup codes
   */
  async setupMFA(userId: string, email: string): Promise<MFASetupResult> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${this.APP_NAME} (${email})`,
        issuer: this.APP_NAME,
        length: 32,
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

      // Generate backup codes
      const backupCodes = await this.generateBackupCodes();

      // Hash backup codes for storage
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(async (code) => ({
          code: await passwordService.hashPassword(code),
          used: false,
        }))
      );

      // Store secret and backup codes in database (not enabled yet)
      await db('users')
        .where({ id: userId })
        .update({
          mfa_secret: secret.base32,
          mfa_backup_codes: JSON.stringify(hashedBackupCodes),
          updated_at: new Date(),
        });

      logger.info({ userId, email }, 'MFA setup initiated');

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Error setting up MFA');
      throw error;
    }
  }

  /**
   * Verify TOTP token and enable MFA
   * @param userId - User ID
   * @param token - TOTP token from authenticator app
   * @returns Success status
   */
  async enableMFA(userId: string, token: string): Promise<boolean> {
    try {
      // Get user's MFA secret
      const user = await db('users').where({ id: userId }).first();
      
      if (!user || !user.mfa_secret) {
        logger.error({ userId }, 'MFA secret not found');
        return false;
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token,
        window: 1, // ±1 window tolerance (±30 seconds)
      });

      if (!verified) {
        logger.warn({ userId }, 'Invalid TOTP token during MFA enable');
        return false;
      }

      // Enable MFA
      await db('users')
        .where({ id: userId })
        .update({
          mfa_enabled: true,
          updated_at: new Date(),
        });

      logger.info({ userId }, 'MFA enabled successfully');
      return true;
    } catch (error) {
      logger.error({ error, userId }, 'Error enabling MFA');
      return false;
    }
  }

  /**
   * Verify TOTP token
   * @param userId - User ID
   * @param token - TOTP token from authenticator app
   * @returns Success status
   */
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    try {
      // Get user's MFA secret
      const user = await db('users').where({ id: userId }).first();
      
      if (!user || !user.mfa_enabled || !user.mfa_secret) {
        logger.error({ userId }, 'MFA not enabled for user');
        return false;
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token,
        window: 1, // ±1 window tolerance (±30 seconds)
      });

      if (verified) {
        logger.info({ userId }, 'TOTP verified successfully');
      } else {
        logger.warn({ userId }, 'Invalid TOTP token');
      }

      return verified;
    } catch (error) {
      logger.error({ error, userId }, 'Error verifying TOTP');
      return false;
    }
  }

  /**
   * Verify backup code
   * @param userId - User ID
   * @param code - Backup code
   * @returns Success status
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      // Get user's backup codes
      const user = await db('users').where({ id: userId }).first();
      
      if (!user || !user.mfa_enabled || !user.mfa_backup_codes) {
        logger.error({ userId }, 'MFA not enabled or no backup codes');
        return false;
      }

      const backupCodes = JSON.parse(user.mfa_backup_codes) as Array<{ code: string; used: boolean }>;

      // Find matching unused backup code
      let codeIndex = -1;
      for (let i = 0; i < backupCodes.length; i++) {
        const backupCode = backupCodes[i];
        if (backupCode && !backupCode.used) {
          const matches = await passwordService.verifyPassword(code, backupCode.code);
          if (matches) {
            codeIndex = i;
            break;
          }
        }
      }

      if (codeIndex === -1) {
        logger.warn({ userId }, 'Invalid or already used backup code');
        return false;
      }

      // Mark code as used
      const codeToUpdate = backupCodes[codeIndex];
      if (codeToUpdate) {
        codeToUpdate.used = true;
      }
      await db('users')
        .where({ id: userId })
        .update({
          mfa_backup_codes: JSON.stringify(backupCodes),
          updated_at: new Date(),
        });

      logger.info({ userId }, 'Backup code verified and marked as used');
      return true;
    } catch (error) {
      logger.error({ error, userId }, 'Error verifying backup code');
      return false;
    }
  }

  /**
   * Disable MFA for user
   * @param userId - User ID
   * @returns Success status
   */
  async disableMFA(userId: string): Promise<boolean> {
    try {
      await db('users')
        .where({ id: userId })
        .update({
          mfa_enabled: false,
          mfa_secret: null,
          mfa_backup_codes: null,
          updated_at: new Date(),
        });

      logger.info({ userId }, 'MFA disabled');
      return true;
    } catch (error) {
      logger.error({ error, userId }, 'Error disabling MFA');
      return false;
    }
  }

  /**
   * Regenerate backup codes
   * @param userId - User ID
   * @returns New backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      // Get user
      const user = await db('users').where({ id: userId }).first();

      if (!user || !user.mfa_enabled) {
        logger.error({ userId }, 'MFA not enabled for user');
        throw new Error('MFA not enabled');
      }

      // Generate new backup codes
      const backupCodes = await this.generateBackupCodes();

      // Hash backup codes for storage
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(async (code) => ({
          code: await passwordService.hashPassword(code),
          used: false,
        }))
      );

      // Update backup codes in database
      await db('users')
        .where({ id: userId })
        .update({
          mfa_backup_codes: JSON.stringify(hashedBackupCodes),
          updated_at: new Date(),
        });

      logger.info({ userId }, 'Backup codes regenerated');
      return backupCodes;
    } catch (error) {
      logger.error({ error, userId }, 'Error regenerating backup codes');
      throw error;
    }
  }

  /**
   * Generate random backup codes
   * @returns Array of backup codes
   */
  private async generateBackupCodes(): Promise<string[]> {
    const codes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      // Generate random alphanumeric code
      const code = crypto
        .randomBytes(this.BACKUP_CODE_LENGTH)
        .toString('hex')
        .substring(0, this.BACKUP_CODE_LENGTH)
        .toUpperCase();

      codes.push(code);
    }

    return codes;
  }
}

/**
 * MFA service singleton
 * Use this instance throughout the application
 */
export const mfaService = new MFAService();

