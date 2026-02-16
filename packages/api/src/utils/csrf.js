import crypto from 'crypto';
import { logger } from '../config/logger';
export function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}
export function validateCsrfToken(cookieToken, headerToken) {
    if (!cookieToken || !headerToken) {
        logger.warn('Missing CSRF token in cookie or header');
        return false;
    }
    try {
        return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
    }
    catch (error) {
        logger.warn({ error }, 'CSRF token validation failed');
        return false;
    }
}
//# sourceMappingURL=csrf.js.map