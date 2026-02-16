import { logger } from '../../config/logger';
class ConsoleEmailService {
    async sendPasswordResetEmail(to, resetLink) {
        logger.info('📧 [EMAIL] Password Reset Email');
        logger.info(`   To: ${to}`);
        logger.info(`   Reset Link: ${resetLink}`);
        logger.info('   ---');
    }
    async sendVerificationEmail(to, verificationLink) {
        logger.info('📧 [EMAIL] Email Verification');
        logger.info(`   To: ${to}`);
        logger.info(`   Verification Link: ${verificationLink}`);
        logger.info('   ---');
    }
}
class SMTPEmailService {
    smtpHost;
    smtpUser;
    smtpPass;
    constructor() {
        this.smtpHost = process.env.SMTP_HOST || '';
        this.smtpUser = process.env.SMTP_USER || '';
        this.smtpPass = process.env.SMTP_PASS || '';
        if (!this.smtpHost || !this.smtpUser || !this.smtpPass) {
            logger.warn('SMTP credentials not configured. Email sending will fail.');
        }
    }
    async sendPasswordResetEmail(to, resetLink) {
        logger.info(`[SMTP] Sending password reset email to ${to}`);
        logger.info(`[SMTP] Reset link: ${resetLink}`);
        throw new Error('SMTP email service not yet implemented. Please use console service for development.');
    }
    async sendVerificationEmail(to, verificationLink) {
        logger.info(`[SMTP] Sending verification email to ${to}`);
        logger.info(`[SMTP] Verification link: ${verificationLink}`);
        throw new Error('SMTP email service not yet implemented. Please use console service for development.');
    }
}
function createEmailService() {
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
export const emailService = createEmailService();
//# sourceMappingURL=email.service.js.map