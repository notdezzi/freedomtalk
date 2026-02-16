import crypto from 'crypto';
import { logger } from '../config/logger';
const DEFAULT_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
};
let encryptionKey = null;
function getEncryptionKey() {
    if (!encryptionKey) {
        const keyHex = process.env.COOKIE_ENCRYPTION_KEY;
        if (!keyHex || keyHex.length !== 64) {
            const error = 'COOKIE_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)';
            logger.error(error);
            throw new Error(error);
        }
        encryptionKey = Buffer.from(keyHex, 'hex');
    }
    return encryptionKey;
}
export function encryptCookie(value) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}
export function decryptCookie(encrypted) {
    try {
        const key = getEncryptionKey();
        const parts = encrypted.split(':');
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
            logger.warn('Invalid encrypted cookie format');
            return null;
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedData = parts[1];
        const authTag = Buffer.from(parts[2], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        logger.error({ error }, 'Error decrypting cookie');
        return null;
    }
}
export function setSecureCookie(reply, name, value, options = {}) {
    const cookieOptions = {
        ...DEFAULT_COOKIE_OPTIONS,
        ...options,
    };
    if (process.env.COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
    reply.setCookie(name, value, cookieOptions);
}
export function setEncryptedCookie(reply, name, value, options = {}) {
    const encrypted = encryptCookie(value);
    setSecureCookie(reply, name, encrypted, options);
}
export function getSecureCookie(request, name) {
    return request.cookies?.[name];
}
export function getEncryptedCookie(request, name) {
    const encrypted = request.cookies?.[name];
    if (!encrypted) {
        return null;
    }
    return decryptCookie(encrypted);
}
export function deleteSecureCookie(reply, name) {
    reply.clearCookie(name, {
        path: '/',
        domain: process.env.COOKIE_DOMAIN,
    });
}
//# sourceMappingURL=cookies.js.map