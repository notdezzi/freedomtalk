/**
 * Password Hashing Service
 * 
 * Provides secure password hashing and verification using bcrypt.
 * Includes password strength validation and rehash detection.
 */

import bcrypt from 'bcrypt';
import { logger } from '../../config/logger';

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Password hashing service
 */
class PasswordService {
  private saltRounds: number;

  constructor() {
    // Get salt rounds from env, default to 12 (industry standard)
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    
    // Enforce minimum of 10 rounds for security
    if (this.saltRounds < 10) {
      logger.warn(`BCRYPT_SALT_ROUNDS is ${this.saltRounds}, enforcing minimum of 10`);
      this.saltRounds = 10;
    }

    logger.info(`Password service initialized with ${this.saltRounds} salt rounds`);
  }

  /**
   * Hash a password using bcrypt
   * @param password - Plain text password to hash
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify a password against a hash using timing-safe comparison
   * @param password - Plain text password to verify
   * @param hash - Hashed password to compare against
   * @returns True if password matches hash, false otherwise
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   * @param password - Password to validate
   * @returns Validation result with errors if any
   */
  validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];

    // Minimum 8 characters
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // Must contain uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Must contain lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Must contain number
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Must contain special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a password hash needs to be rehashed
   * This is useful for upgrading security when salt rounds are increased
   * @param hash - Password hash to check
   * @returns True if hash needs to be rehashed, false otherwise
   */
  needsRehash(hash: string): boolean {
    try {
      const rounds = bcrypt.getRounds(hash);
      return rounds < this.saltRounds;
    } catch (error) {
      logger.error({ error }, 'Error checking hash rounds');
      return false;
    }
  }
}

/**
 * Password service singleton
 * Use this instance throughout the application
 */
export const passwordService = new PasswordService();

