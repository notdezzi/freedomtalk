/**
 * Email Service Interface
 * 
 * Provides email sending functionality with multiple implementations:
 * - Console: Logs emails to console (development)
 * - SMTP: Sends emails via SMTP server (production)
 */

import { logger } from '../../config/logger';

/**
 * Email service interface
 */
export interface IEmailService {
  sendPasswordResetEmail(to: string, resetLink: string): Promise<void>;
  sendVerificationEmail(to: string, verificationLink: string): Promise<void>;
}

/**
 * Console email service implementation (for development)
 * Logs emails to console instead of sending them
 */
class ConsoleEmailService implements IEmailService {
  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    logger.info('📧 [EMAIL] Password Reset Email');
    logger.info(`   To: ${to}`);
    logger.info(`   Reset Link: ${resetLink}`);
    logger.info('   ---');
  }

  async sendVerificationEmail(to: string, verificationLink: string): Promise<void> {
    logger.info('📧 [EMAIL] Email Verification');
    logger.info(`   To: ${to}`);
    logger.info(`   Verification Link: ${verificationLink}`);
    logger.info('   ---');
  }
}

/**
 * SMTP email service implementation (for production)
 * Placeholder for future SMTP integration
 */
class SMTPEmailService implements IEmailService {
  private smtpHost: string;
  private smtpUser: string;
  private smtpPass: string;

  constructor() {
    this.smtpHost = process.env.SMTP_HOST || '';
    this.smtpUser = process.env.SMTP_USER || '';
    this.smtpPass = process.env.SMTP_PASS || '';

    if (!this.smtpHost || !this.smtpUser || !this.smtpPass) {
      logger.warn('SMTP credentials not configured. Email sending will fail.');
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    // TODO: Implement SMTP email sending using nodemailer or similar
    logger.info(`[SMTP] Sending password reset email to ${to}`);
    logger.info(`[SMTP] Reset link: ${resetLink}`);
    
    // Placeholder implementation
    throw new Error('SMTP email service not yet implemented. Please use console service for development.');
  }

  async sendVerificationEmail(to: string, verificationLink: string): Promise<void> {
    // TODO: Implement SMTP email sending using nodemailer or similar
    logger.info(`[SMTP] Sending verification email to ${to}`);
    logger.info(`[SMTP] Verification link: ${verificationLink}`);
    
    // Placeholder implementation
    throw new Error('SMTP email service not yet implemented. Please use console service for development.');
  }
}

/**
 * Email service factory
 * Returns the appropriate email service based on EMAIL_SERVICE env var
 */
function createEmailService(): IEmailService {
  const emailService = process.env.EMAIL_SERVICE || 'console';

  switch (emailService.toLowerCase()) {
    case 'smtp':
      logger.info('Using SMTP email service');
      return new SMTPEmailService();
    case 'console':
    default:
      logger.info('Using console email service (development mode)');
      return new ConsoleEmailService();
  }
}

/**
 * Email service singleton
 * Use this instance throughout the application
 */
export const emailService = createEmailService();

