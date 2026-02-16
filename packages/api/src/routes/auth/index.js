import { registerSchema, loginSchema, refreshTokenSchema, oauth2CallbackSchema } from '@freedomtalk/shared';
import { validateBody, validateQuery } from '../../middleware/validation.middleware';
import { successResponse } from '../../utils/errors';
import { AuthenticationError, ConflictError, ApiError, ApiErrorCode } from '../../types/api.types';
import { jwtService } from '../../services/auth/jwt.service';
import { sessionService } from '../../services/auth/session.service';
import { passwordService } from '../../services/auth/password.service';
import { mfaService } from '../../services/auth/mfa.service';
import { googleOAuth2Service } from '../../services/auth/google-oauth.service';
import { githubOAuth2Service } from '../../services/auth/github-oauth.service';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { snowflake } from '../../utils/snowflake';
export default async function authRoutes(app) {
    app.post('/register', {
        schema: {
            description: 'Register a new user account',
            tags: ['Authentication'],
            body: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                    username: { type: 'string', minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_]+$' },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8, maxLength: 128 },
                },
            },
            response: {
                201: {
                    description: 'User registered successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                userId: { type: 'string' },
                                username: { type: 'string' },
                                email: { type: 'string' },
                                message: { type: 'string' },
                            },
                        },
                    },
                },
                409: {
                    description: 'Email or username already exists',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string' },
                                message: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '15 minutes',
            },
        },
        preHandler: validateBody(registerSchema),
    }, async (request, reply) => {
        const { username, email, password } = request.body;
        const result = await db.transaction(async (trx) => {
            const existingEmail = await trx('users').where({ email }).first();
            if (existingEmail) {
                throw new ConflictError('Email already registered');
            }
            const existingUsername = await trx('users').where({ username }).first();
            if (existingUsername) {
                throw new ConflictError('Username already taken');
            }
            const passwordHash = await passwordService.hashPassword(password);
            const userId = snowflake.generate();
            await trx('users').insert({
                id: userId,
                email,
                username,
                password_hash: passwordHash,
                email_verified: false,
                mfa_enabled: false,
                account_status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
            });
            await trx('user_profiles').insert({
                id: snowflake.generate(),
                user_id: userId,
                display_name: username,
            });
            return { userId, username, email };
        });
        logger.info({ userId: result.userId, email: result.email }, 'User registered successfully');
        reply.status(201).send(successResponse({
            userId: result.userId,
            username: result.username,
            email: result.email,
            message: 'Registration successful. Please verify your email.',
        }));
    });
    app.post('/login', {
        schema: {
            description: 'Authenticate user and receive access and refresh tokens',
            tags: ['Authentication'],
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                },
            },
            response: {
                200: {
                    description: 'Login successful',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                accessToken: { type: 'string' },
                                refreshToken: { type: 'string' },
                                user: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        username: { type: 'string' },
                                        email: { type: 'string' },
                                        emailVerified: { type: 'boolean' },
                                    },
                                },
                            },
                        },
                    },
                },
                401: {
                    description: 'Invalid credentials',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string' },
                                message: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '15 minutes',
            },
        },
        preHandler: validateBody(loginSchema),
    }, async (request, reply) => {
        const { email, password } = request.body;
        const user = await db('users').where({ email }).first();
        if (!user) {
            throw new AuthenticationError('Invalid credentials');
        }
        const isValid = await passwordService.verifyPassword(password, user.password_hash);
        if (!isValid) {
            logger.warn({ email, ip: request.ip }, 'Failed login attempt');
            throw new AuthenticationError('Invalid credentials');
        }
        if (user.account_status !== 'active') {
            throw new AuthenticationError('Account is not active');
        }
        const sessionId = await sessionService.createSession(user.id, {
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            mfaVerified: false,
        });
        if (user.mfa_enabled) {
            logger.info({ userId: user.id, sessionId }, 'MFA verification required');
            return reply.send(successResponse({
                mfaRequired: true,
                sessionId,
                message: 'MFA verification required',
            }));
        }
        const accessToken = jwtService.generateAccessToken(user.id);
        const refreshToken = jwtService.generateRefreshToken(user.id, sessionId);
        logger.info({ userId: user.id, sessionId }, 'User logged in successfully');
        reply.send(successResponse({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                emailVerified: user.email_verified,
            },
        }));
    });
    app.post('/mfa/verify', {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '5 minutes',
            },
        },
    }, async (request, reply) => {
        const { sessionId, code } = request.body;
        if (!sessionId || !code) {
            throw new AuthenticationError('Session ID and code are required');
        }
        try {
            const session = await sessionService.getSession(sessionId);
            if (!session) {
                throw new AuthenticationError('Invalid or expired session');
            }
            const user = await db('users').where({ id: session.userId }).first();
            if (!user || !user.mfa_enabled) {
                throw new AuthenticationError('MFA not enabled for this user');
            }
            let verified = await mfaService.verifyTOTP(user.id, code);
            if (!verified) {
                verified = await mfaService.verifyBackupCode(user.id, code);
            }
            if (!verified) {
                logger.warn({ userId: user.id, sessionId }, 'Invalid MFA code');
                throw new AuthenticationError('Invalid MFA code');
            }
            await sessionService.updateSession(sessionId, {
                mfaVerified: true,
            });
            const accessToken = jwtService.generateAccessToken(user.id, { sessionId });
            const refreshToken = jwtService.generateRefreshToken(user.id, sessionId);
            logger.info({ userId: user.id, sessionId }, 'MFA verified successfully');
            reply.send(successResponse({
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    emailVerified: user.email_verified,
                },
            }));
        }
        catch (error) {
            throw error;
        }
    });
    app.post('/refresh', {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute',
            },
        },
        preHandler: validateBody(refreshTokenSchema),
    }, async (request, reply) => {
        const { refresh_token } = request.body;
        try {
            const payload = await jwtService.verifyToken(refresh_token);
            if (payload.type !== 'refresh' || !payload.sessionId) {
                throw new AuthenticationError('Invalid refresh token');
            }
            const session = await sessionService.getSession(payload.sessionId);
            if (!session) {
                throw new AuthenticationError('Session expired');
            }
            const user = await db('users').where({ id: payload.userId }).first();
            if (!user) {
                throw new AuthenticationError('User not found');
            }
            await jwtService.blacklistToken(refresh_token);
            const newAccessToken = user.mfa_enabled
                ? jwtService.generateAccessToken(payload.userId, { sessionId: payload.sessionId })
                : jwtService.generateAccessToken(payload.userId);
            const newRefreshToken = jwtService.generateRefreshToken(payload.userId, payload.sessionId);
            await sessionService.updateSession(payload.sessionId, {
                lastActivity: Date.now(),
            });
            logger.info({ userId: payload.userId, sessionId: payload.sessionId }, 'Tokens refreshed');
            reply.send(successResponse({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            }));
        }
        catch (error) {
            throw error;
        }
    });
    app.post('/logout', {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute',
            },
        },
    }, async (request, reply) => {
        const { refresh_token } = request.body || {};
        try {
            const authHeader = request.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const accessToken = authHeader.substring(7);
                await jwtService.blacklistToken(accessToken);
                logger.info('Access token blacklisted during logout');
            }
            if (refresh_token) {
                const payload = jwtService.decodeToken(refresh_token);
                if (payload && payload.sessionId) {
                    await sessionService.deleteSession(payload.sessionId);
                    await jwtService.blacklistToken(refresh_token);
                    logger.info({ userId: payload.userId, sessionId: payload.sessionId }, 'User logged out');
                }
            }
            reply.send(successResponse({
                message: 'Logged out successfully',
            }));
        }
        catch (error) {
            logger.error({ error }, 'Error during logout');
            reply.send(successResponse({
                message: 'Logged out successfully',
            }));
        }
    });
    app.get('/google/authorize', async (_request, reply) => {
        try {
            const authUrl = await googleOAuth2Service.getAuthorizationUrl();
            reply.send(successResponse({ authorizationUrl: authUrl }));
        }
        catch (error) {
            logger.error({ error }, 'Error generating Google auth URL');
            throw new ApiError(ApiErrorCode.OAUTH2_ERROR, 'Failed to initiate Google authentication', 500);
        }
    });
    app.get('/google/callback', {
        preHandler: validateQuery(oauth2CallbackSchema),
    }, async (request, reply) => {
        const { code, state } = request.query;
        try {
            const expectedRedirectUri = process.env.GOOGLE_REDIRECT_URI;
            if (!expectedRedirectUri) {
                throw new ApiError(ApiErrorCode.OAUTH2_ERROR, 'OAuth2 not configured', 500);
            }
            const profile = await googleOAuth2Service.authenticate(code, state);
            let user = await db('users').where({ email: profile.email }).first();
            if (!user) {
                const result = await db.transaction(async (trx) => {
                    const userId = snowflake.generate();
                    await trx('users').insert({
                        id: userId,
                        email: profile.email,
                        username: profile.email.split('@')[0] + '_' + userId.slice(-6),
                        password_hash: '',
                        email_verified: profile.emailVerified || false,
                        mfa_enabled: false,
                        account_status: 'active',
                        created_at: new Date(),
                        updated_at: new Date(),
                    });
                    await trx('user_profiles').insert({
                        id: snowflake.generate(),
                        user_id: userId,
                        display_name: profile.name || profile.email.split('@')[0],
                        avatar_url: profile.avatar,
                    });
                    return await trx('users').where({ id: userId }).first();
                });
                user = result;
                logger.info({ userId: user.id, email: user.email }, 'New user created via Google OAuth2');
            }
            const sessionId = await sessionService.createSession(user.id, {
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
                mfaVerified: false,
            });
            if (user.mfa_enabled) {
                logger.info({ userId: user.id, sessionId }, 'MFA verification required for OAuth login');
                return reply.send(successResponse({
                    mfaRequired: true,
                    sessionId,
                    message: 'MFA verification required',
                }));
            }
            const accessToken = jwtService.generateAccessToken(user.id);
            const refreshToken = jwtService.generateRefreshToken(user.id, sessionId);
            logger.info({ userId: user.id, sessionId }, 'User authenticated via Google OAuth2');
            reply.send(successResponse({
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    emailVerified: user.email_verified,
                },
            }));
        }
        catch (error) {
            logger.error({ error }, 'Google OAuth2 callback error');
            throw error;
        }
    });
    app.get('/github/authorize', async (_request, reply) => {
        try {
            const authUrl = await githubOAuth2Service.getAuthorizationUrl();
            reply.send(successResponse({ authorizationUrl: authUrl }));
        }
        catch (error) {
            logger.error({ error }, 'Error generating GitHub auth URL');
            throw new ApiError(ApiErrorCode.OAUTH2_ERROR, 'Failed to initiate GitHub authentication', 500);
        }
    });
    app.get('/github/callback', {
        preHandler: validateQuery(oauth2CallbackSchema),
    }, async (request, reply) => {
        const { code, state } = request.query;
        try {
            const expectedRedirectUri = process.env.GITHUB_REDIRECT_URI;
            if (!expectedRedirectUri) {
                throw new ApiError(ApiErrorCode.OAUTH2_ERROR, 'OAuth2 not configured', 500);
            }
            const profile = await githubOAuth2Service.authenticate(code, state);
            let user = await db('users').where({ email: profile.email }).first();
            if (!user) {
                const result = await db.transaction(async (trx) => {
                    const userId = snowflake.generate();
                    await trx('users').insert({
                        id: userId,
                        email: profile.email,
                        username: profile.name?.replace(/\s+/g, '_').toLowerCase() + '_' + userId.slice(-6) || profile.email.split('@')[0] + '_' + userId.slice(-6),
                        password_hash: '',
                        email_verified: profile.emailVerified || false,
                        mfa_enabled: false,
                        account_status: 'active',
                        created_at: new Date(),
                        updated_at: new Date(),
                    });
                    await trx('user_profiles').insert({
                        id: snowflake.generate(),
                        user_id: userId,
                        display_name: profile.name || profile.email.split('@')[0],
                        avatar_url: profile.avatar,
                    });
                    return await trx('users').where({ id: userId }).first();
                });
                user = result;
                logger.info({ userId: user.id, email: user.email }, 'New user created via GitHub OAuth2');
            }
            const sessionId = await sessionService.createSession(user.id, {
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
                mfaVerified: false,
            });
            if (user.mfa_enabled) {
                logger.info({ userId: user.id, sessionId }, 'MFA verification required for OAuth login');
                return reply.send(successResponse({
                    mfaRequired: true,
                    sessionId,
                    message: 'MFA verification required',
                }));
            }
            const accessToken = jwtService.generateAccessToken(user.id);
            const refreshToken = jwtService.generateRefreshToken(user.id, sessionId);
            logger.info({ userId: user.id, sessionId }, 'User authenticated via GitHub OAuth2');
            reply.send(successResponse({
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    emailVerified: user.email_verified,
                },
            }));
        }
        catch (error) {
            logger.error({ error }, 'GitHub OAuth2 callback error');
            throw error;
        }
    });
    app.get('/session', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new AuthenticationError('No token provided');
            }
            const token = authHeader.substring(7);
            const payload = await jwtService.verifyToken(token);
            const user = await db('users').where({ id: payload.userId }).first();
            if (!user) {
                throw new AuthenticationError('User not found');
            }
            reply.send(successResponse({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    emailVerified: user.email_verified,
                    mfaEnabled: user.mfa_enabled,
                    accountStatus: user.account_status,
                },
            }));
        }
        catch (error) {
            throw error;
        }
    });
}
//# sourceMappingURL=index.js.map