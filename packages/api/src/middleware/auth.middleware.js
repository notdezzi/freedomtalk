import { jwtService } from '../services/auth/jwt.service';
import { sessionService } from '../services/auth/session.service';
import { db } from '../config/database';
import { logger } from '../config/logger';
import { ApiErrorCode } from '../types/api.types';
import { genericErrorResponse } from '../utils/errors';
function extractToken(request) {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    const cookieToken = request.cookies?.access_token;
    if (cookieToken) {
        return cookieToken;
    }
    return null;
}
async function loadUser(userId) {
    try {
        const user = await db('users')
            .where({ id: userId })
            .select('id', 'email', 'username', 'email_verified', 'mfa_enabled', 'account_status')
            .first();
        if (!user) {
            return null;
        }
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            emailVerified: user.email_verified,
            mfaEnabled: user.mfa_enabled,
            accountStatus: user.account_status,
        };
    }
    catch (error) {
        logger.error({ error, userId }, 'Error loading user');
        return null;
    }
}
export async function requireAuth(request, reply) {
    try {
        const token = extractToken(request);
        if (!token) {
            return reply.status(401).send(genericErrorResponse('Authentication required', ApiErrorCode.UNAUTHORIZED, request.id));
        }
        let payload;
        try {
            payload = await jwtService.verifyToken(token);
        }
        catch (error) {
            logger.warn({ error }, 'Invalid or expired token');
            return reply.status(401).send(genericErrorResponse('Invalid or expired token', ApiErrorCode.UNAUTHORIZED, request.id));
        }
        const user = await loadUser(payload.userId);
        if (!user) {
            return reply.status(401).send(genericErrorResponse('User not found', ApiErrorCode.UNAUTHORIZED, request.id));
        }
        if (user.accountStatus !== 'active') {
            return reply.status(401).send(genericErrorResponse('Account is not active', ApiErrorCode.UNAUTHORIZED, request.id));
        }
        request.user = user;
        if (user.mfaEnabled) {
            if (!payload.sessionId) {
                return reply.status(401).send(genericErrorResponse('MFA verification required', ApiErrorCode.UNAUTHORIZED, request.id));
            }
            const session = await sessionService.getSession(payload.sessionId);
            if (!session || !session.mfaVerified) {
                return reply.status(401).send(genericErrorResponse('MFA verification required', ApiErrorCode.UNAUTHORIZED, request.id));
            }
            request.sessionId = payload.sessionId;
        }
    }
    catch (error) {
        logger.error({ error }, 'Error in requireAuth middleware');
        return reply.status(500).send({
            error: 'internal_error',
            message: 'Internal server error',
        });
    }
}
export async function optionalAuth(request, _reply) {
    try {
        const token = extractToken(request);
        if (!token) {
            return;
        }
        let payload;
        try {
            payload = await jwtService.verifyToken(token);
        }
        catch (error) {
            logger.debug({ error }, 'Invalid token in optionalAuth');
            return;
        }
        const user = await loadUser(payload.userId);
        if (!user || user.accountStatus !== 'active') {
            return;
        }
        request.user = user;
        if (payload.sessionId) {
            request.sessionId = payload.sessionId;
        }
    }
    catch (error) {
        logger.error({ error }, 'Error in optionalAuth middleware');
    }
}
//# sourceMappingURL=auth.middleware.js.map