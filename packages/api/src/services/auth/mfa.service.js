import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { passwordService } from './password.service';
class MFAService {
    APP_NAME = 'FreedomTalk';
    BACKUP_CODE_COUNT = 10;
    BACKUP_CODE_LENGTH = 8;
    async setupMFA(userId, email) {
        try {
            const secret = speakeasy.generateSecret({
                name: `${this.APP_NAME} (${email})`,
                issuer: this.APP_NAME,
                length: 32,
            });
            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');
            const backupCodes = await this.generateBackupCodes();
            const hashedBackupCodes = await Promise.all(backupCodes.map(async (code) => ({
                code: await passwordService.hashPassword(code),
                used: false,
            })));
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
        }
        catch (error) {
            logger.error({ error, userId }, 'Error setting up MFA');
            throw error;
        }
    }
    async enableMFA(userId, token) {
        try {
            const user = await db('users').where({ id: userId }).first();
            if (!user || !user.mfa_secret) {
                logger.error({ userId }, 'MFA secret not found');
                return false;
            }
            const verified = speakeasy.totp.verify({
                secret: user.mfa_secret,
                encoding: 'base32',
                token,
                window: 1,
            });
            if (!verified) {
                logger.warn({ userId }, 'Invalid TOTP token during MFA enable');
                return false;
            }
            await db('users')
                .where({ id: userId })
                .update({
                mfa_enabled: true,
                updated_at: new Date(),
            });
            logger.info({ userId }, 'MFA enabled successfully');
            return true;
        }
        catch (error) {
            logger.error({ error, userId }, 'Error enabling MFA');
            return false;
        }
    }
    async verifyTOTP(userId, token) {
        try {
            const user = await db('users').where({ id: userId }).first();
            if (!user || !user.mfa_enabled || !user.mfa_secret) {
                logger.error({ userId }, 'MFA not enabled for user');
                return false;
            }
            const verified = speakeasy.totp.verify({
                secret: user.mfa_secret,
                encoding: 'base32',
                token,
                window: 1,
            });
            if (verified) {
                logger.info({ userId }, 'TOTP verified successfully');
            }
            else {
                logger.warn({ userId }, 'Invalid TOTP token');
            }
            return verified;
        }
        catch (error) {
            logger.error({ error, userId }, 'Error verifying TOTP');
            return false;
        }
    }
    async verifyBackupCode(userId, code) {
        try {
            const user = await db('users').where({ id: userId }).first();
            if (!user || !user.mfa_enabled || !user.mfa_backup_codes) {
                logger.error({ userId }, 'MFA not enabled or no backup codes');
                return false;
            }
            const backupCodes = JSON.parse(user.mfa_backup_codes);
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
        }
        catch (error) {
            logger.error({ error, userId }, 'Error verifying backup code');
            return false;
        }
    }
    async disableMFA(userId) {
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
        }
        catch (error) {
            logger.error({ error, userId }, 'Error disabling MFA');
            return false;
        }
    }
    async regenerateBackupCodes(userId) {
        try {
            const user = await db('users').where({ id: userId }).first();
            if (!user || !user.mfa_enabled) {
                logger.error({ userId }, 'MFA not enabled for user');
                throw new Error('MFA not enabled');
            }
            const backupCodes = await this.generateBackupCodes();
            const hashedBackupCodes = await Promise.all(backupCodes.map(async (code) => ({
                code: await passwordService.hashPassword(code),
                used: false,
            })));
            await db('users')
                .where({ id: userId })
                .update({
                mfa_backup_codes: JSON.stringify(hashedBackupCodes),
                updated_at: new Date(),
            });
            logger.info({ userId }, 'Backup codes regenerated');
            return backupCodes;
        }
        catch (error) {
            logger.error({ error, userId }, 'Error regenerating backup codes');
            throw error;
        }
    }
    async generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
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
export const mfaService = new MFAService();
//# sourceMappingURL=mfa.service.js.map