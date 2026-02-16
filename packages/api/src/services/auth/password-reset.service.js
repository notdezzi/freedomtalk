import crypto from 'crypto';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { emailService } from '../email/email.service';
import { passwordService } from './password.service';
class PasswordResetService {
    TOKEN_EXPIRY = 60 * 60 * 1000;
    RATE_LIMIT_WINDOW = 60 * 60 * 1000;
    MAX_REQUESTS_PER_WINDOW = 3;
    async requestPasswordReset(email, ipAddress) {
        try {
            const user = await db('users').where({ email }).first();
            if (!user) {
                logger.info({ email, ipAddress }, 'Password reset requested for non-existent email');
                return {
                    success: true,
                    message: 'If an account exists with this email, a password reset link has been sent.',
                };
            }
            const recentRequests = await db('password_resets')
                .where({ user_id: user.id })
                .where('created_at', '>', new Date(Date.now() - this.RATE_LIMIT_WINDOW))
                .count('* as count')
                .first();
            if (recentRequests && Number(recentRequests.count) >= this.MAX_REQUESTS_PER_WINDOW) {
                logger.warn({ userId: user.id, email, ipAddress }, 'Password reset rate limit exceeded');
                return {
                    success: true,
                    message: 'If an account exists with this email, a password reset link has been sent.',
                };
            }
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY);
            await db('password_resets').insert({
                user_id: user.id,
                token,
                expires_at: expiresAt,
                created_at: new Date(),
            });
            const resetLink = `${process.env.WEB_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
            await emailService.sendPasswordResetEmail(user.email, resetLink);
            logger.info({ userId: user.id, email, ipAddress }, 'Password reset requested');
            return {
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.',
            };
        }
        catch (error) {
            logger.error({ error, email, ipAddress }, 'Error requesting password reset');
            return {
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.',
            };
        }
    }
    async validateResetToken(token) {
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
        }
        catch (error) {
            logger.error({ error }, 'Error validating reset token');
            return null;
        }
    }
    async resetPassword(token, newPassword, ipAddress) {
        try {
            const userId = await this.validateResetToken(token);
            if (!userId) {
                logger.warn({ ipAddress, reason: 'Invalid or expired token' }, 'Failed password reset attempt');
                return false;
            }
            const validation = passwordService.validatePasswordStrength(newPassword);
            if (!validation.valid) {
                logger.warn({ userId, ipAddress, reason: 'Weak password', errors: validation.errors }, 'Failed password reset attempt');
                return false;
            }
            const passwordHash = await passwordService.hashPassword(newPassword);
            await db('users')
                .where({ id: userId })
                .update({
                password_hash: passwordHash,
                updated_at: new Date(),
            });
            await db('password_resets')
                .where({ token })
                .update({
                used_at: new Date(),
            });
            logger.info({ userId, ipAddress }, 'Password reset successful');
            return true;
        }
        catch (error) {
            logger.error({ error, ipAddress }, 'Error resetting password');
            return false;
        }
    }
    async cleanupExpiredTokens() {
        try {
            const deleted = await db('password_resets')
                .where('expires_at', '<', new Date())
                .orWhereNotNull('used_at')
                .delete();
            if (deleted > 0) {
                logger.info({ count: deleted }, 'Cleaned up expired password reset tokens');
            }
            return deleted;
        }
        catch (error) {
            logger.error({ error }, 'Error cleaning up expired tokens');
            return 0;
        }
    }
}
export const passwordResetService = new PasswordResetService();
//# sourceMappingURL=password-reset.service.js.map