/**
 * Email Service Interface
 *
 * Provides email sending functionality with multiple implementations:
 * - Console: Logs emails to console (development)
 * - SMTP: Sends emails via SMTP server (production)
 */

import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../../config/logger';

/**
 * Email service interface
 */
export interface IEmailService {
  sendPasswordResetEmail(to: string, resetLink: string): Promise<void>;
  sendVerificationEmail(to: string, verificationLink: string): Promise<void>;
  sendEmail(to: string, subject: string, html: string, text?: string): Promise<void>;
}

/**
 * Email configuration interface
 */
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

/**
 * Get email configuration from environment
 */
function getEmailConfig(): EmailConfig {
  return {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'FreedomTalk',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@freedomtalk.local',
  };
}

/**
 * Email templates
 */
const emailTemplates = {
  passwordReset: (resetLink: string) => ({
    subject: 'Reset Your Password - FreedomTalk',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #5865F2 0%, #7289DA 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">FreedomTalk</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #666;">You requested to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #5865F2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color: #5865F2; word-break: break-all;">${resetLink}</a>
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} FreedomTalk. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text: `
FreedomTalk - Reset Your Password

You requested to reset your password. Please click the link below to create a new password:

${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.

© ${new Date().getFullYear()} FreedomTalk. All rights reserved.
    `.trim(),
  }),

  emailVerification: (verificationLink: string) => ({
    subject: 'Verify Your Email - FreedomTalk',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #5865F2 0%, #7289DA 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">FreedomTalk</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
          <p style="color: #666;">Welcome to FreedomTalk! Please verify your email address to get started:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background: #5865F2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block;">Verify Email</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 24 hours for security reasons.</p>
          <p style="color: #666; font-size: 14px;">If you didn't create an account with FreedomTalk, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationLink}" style="color: #5865F2; word-break: break-all;">${verificationLink}</a>
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} FreedomTalk. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text: `
FreedomTalk - Verify Your Email Address

Welcome to FreedomTalk! Please verify your email address by clicking the link below:

${verificationLink}

This link will expire in 24 hours for security reasons.

If you didn't create an account with FreedomTalk, you can safely ignore this email.

© ${new Date().getFullYear()} FreedomTalk. All rights reserved.
    `.trim(),
  }),
};

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

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    logger.info('📧 [EMAIL] Custom Email');
    logger.info(`   To: ${to}`);
    logger.info(`   Subject: ${subject}`);
    logger.info(`   HTML: ${html.substring(0, 100)}...`);
    if (text) {
      logger.info(`   Text: ${text.substring(0, 100)}...`);
    }
    logger.info('   ---');
  }
}

/**
 * SMTP email service implementation (for production)
 * Sends emails via SMTP server using nodemailer
 */
class SMTPEmailService implements IEmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig;

  constructor() {
    this.config = getEmailConfig();
    this.initializeTransporter();
  }

  /**
   * Initialize the nodemailer transporter
   */
  private initializeTransporter(): void {
    if (!this.config.host || !this.config.user || !this.config.pass) {
      logger.warn('SMTP credentials not configured. Email sending will use console fallback.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
      // Connection timeout settings
      connectionTimeout: 10000, // 10 seconds
      socketTimeout: 10000, // 10 seconds
    });

    logger.info({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      user: this.config.user,
    }, 'SMTP transporter initialized');
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('SMTP transporter not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
      return true;
    } catch (error) {
      logger.error({ error }, 'SMTP connection verification failed');
      return false;
    }
  }

  /**
   * Send an email
   */
  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (!this.transporter) {
      logger.warn('SMTP transporter not available, falling back to console');
      new ConsoleEmailService().sendEmail(to, subject, html, text);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for plain text fallback
      });

      logger.info({
        to,
        subject,
        messageId: info.messageId,
        response: info.response,
      }, 'Email sent successfully');
    } catch (error) {
      logger.error({ error, to, subject }, 'Failed to send email');
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    const template = emailTemplates.passwordReset(resetLink);
    await this.sendEmail(to, template.subject, template.html, template.text);
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(to: string, verificationLink: string): Promise<void> {
    const template = emailTemplates.emailVerification(verificationLink);
    await this.sendEmail(to, template.subject, template.html, template.text);
  }
}

/**
 * Email service factory
 * Returns the appropriate email service based on EMAIL_SERVICE env var
 */
function createEmailService(): IEmailService {
  const emailService = process.env.EMAIL_SERVICE || 'console';

  switch (emailService.toLowerCase()) {
    case 'smtp': {
      const config = getEmailConfig();
      if (!config.host || !config.user || !config.pass) {
        logger.warn('SMTP service requested but credentials not configured. Falling back to console.');
        return new ConsoleEmailService();
      }
      logger.info('Using SMTP email service');
      return new SMTPEmailService();
    }
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
