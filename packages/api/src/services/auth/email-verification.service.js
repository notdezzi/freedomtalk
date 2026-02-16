import crypto from 'crypto';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { emailService } from '../email/email.service';
class EmailVerificationService {
    TOKEN_EXPIRY = 24 * 60 * 60 * 1000;
    RATE_LIMIT_WINDOW = 60 * 60 * 1000;
    MAX_SENDS_PER_WINDOW = 3;
    async sendVerificationEmail(userId, ipAddress) {
        try {
            const user = await db('users').where({ id: userId }).first();
            if (!user) {
                logger.error({ userId }, 'User not found for email verification');
                return false;
            }
            if (user.email_verified) {
                logger.info({ userId }, 'Email already verified');
                return true;
            }
            const recentSends = await db('users')
                .where({ id: userId })
                .where('verification_token_expires', '>', new Date(Date.now() - this.RATE_LIMIT_WINDOW))
                .count('* as count')
                .first();
            if (recentSends && Number(recentSends.count) >= this.MAX_SENDS_PER_WINDOW) {
                logger.warn({ userId, ipAddress }, 'Email verification rate limit exceeded');
                return false;
            }
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY);
            await db('users')
                .where({ id: userId })
                .update({
                verification_token: token,
                verification_token_expires: expiresAt,
                updated_at: new Date(),
            });
            const verificationLink = `${process.env.WEB_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
            await emailService.sendVerificationEmail(user.email, verificationLink);
            logger.info({ userId, email: user.email, ipAddress }, 'Verification email sent');
            return true;
        }
        catch (error) {
            logger.error({ error, userId, ipAddress }, 'Error sending verification email');
            return false;
        }
    }
    async verifyEmail(token, ipAddress) {
        try {
            const user = await db('users')
                .where({ verification_token: token })
                .where('verification_token_expires', '>', new Date())
                .first();
            if (!user) {
                logger.warn({ ipAddress, reason: 'Invalid or expired token' }, 'Failed email verification attempt');
                return false;
            }
            if (user.email_verified) {
                logger.info({ userId: user.id }, 'Email already verified');
                return true;
            }
            await db('users')
                .where({ id: user.id })
                .update({
                email_verified: true,
                verification_token: null,
                verification_token_expires: null,
                updated_at: new Date(),
            });
            logger.info({ userId: user.id, email: user.email, ipAddress }, 'Email verified successfully');
            return true;
        }
        catch (error) {
            logger.error({ error, ipAddress }, 'Error verifying email');
            return false;
        }
    }
    async resendVerificationEmail(userId, ipAddress) {
        return this.sendVerificationEmail(userId, ipAddress);
    }
    async cleanupExpiredTokens() {
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
        }
        catch (error) {
            logger.error({ error }, 'Error cleaning up expired verification tokens');
            return 0;
        }
    }
}
export const emailVerificationService = new EmailVerificationService();
//# sourceMappingURL=email-verification.service.js.map