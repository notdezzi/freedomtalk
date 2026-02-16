import { generateCsrfToken, validateCsrfToken } from '../utils/csrf';
import { logger } from '../config/logger';
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
export async function setCsrfToken(request, reply) {
    let csrfToken = request.cookies?.[CSRF_COOKIE_NAME];
    if (!csrfToken) {
        csrfToken = generateCsrfToken();
        reply.setCookie(CSRF_COOKIE_NAME, csrfToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24,
        });
        logger.debug('CSRF token generated and set in cookie');
    }
}
export async function validateCsrf(request, reply) {
    if (!PROTECTED_METHODS.includes(request.method)) {
        return;
    }
    const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = request.headers[CSRF_HEADER_NAME];
    const isValid = validateCsrfToken(cookieToken, headerToken);
    if (!isValid) {
        logger.warn({
            method: request.method,
            url: request.url,
            ip: request.ip,
        }, 'CSRF validation failed');
        return reply.status(403).send({
            error: 'csrf_validation_failed',
            message: 'CSRF token validation failed',
        });
    }
    logger.debug('CSRF token validated successfully');
}
export async function csrfProtection(request, reply) {
    if (request.method === 'GET') {
        await setCsrfToken(request, reply);
    }
    else if (PROTECTED_METHODS.includes(request.method)) {
        await validateCsrf(request, reply);
    }
}
//# sourceMappingURL=csrf.middleware.js.map