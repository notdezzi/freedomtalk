import bcrypt from 'bcrypt';
import { logger } from '../../config/logger';
class PasswordService {
    saltRounds;
    constructor() {
        this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
        if (this.saltRounds < 10) {
            logger.warn(`BCRYPT_SALT_ROUNDS is ${this.saltRounds}, enforcing minimum of 10`);
            this.saltRounds = 10;
        }
        logger.info(`Password service initialized with ${this.saltRounds} salt rounds`);
    }
    async hashPassword(password) {
        return bcrypt.hash(password, this.saltRounds);
    }
    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    validatePasswordStrength(password) {
        const errors = [];
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    needsRehash(hash) {
        try {
            const rounds = bcrypt.getRounds(hash);
            return rounds < this.saltRounds;
        }
        catch (error) {
            logger.error({ error }, 'Error checking hash rounds');
            return false;
        }
    }
}
export const passwordService = new PasswordService();
//# sourceMappingURL=password.service.js.map