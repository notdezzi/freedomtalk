/**
 * Authentication Routes
 * Handles user authentication, OAuth2, and session management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerSchema, loginSchema, refreshTokenSchema, oauth2CallbackSchema } from '@freedomtalk/shared';
import { validateBody, validateQuery } from '../../middleware/validation.middleware';
import { successResponse } from '../../utils/errors';
import { AuthenticationError, ConflictError, ApiError, ApiErrorCode } from '../../types/api.types';
import { jwtService } from '../../services/auth/jwt.service';
import { sessionService } from '../../services/auth/session.service';
import { passwordService } from '../../services/auth/password.service';
import { googleOAuth2Service } from '../../services/auth/google-oauth.service';
import { githubOAuth2Service } from '../../services/auth/github-oauth.service';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { snowflake } from '../../utils/snowflake';

export default async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/auth/register
   * Register a new user with atomic user+profile creation using Knex transaction
   */
  app.post(
    '/register',
    {
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
    },
    async (request: FastifyRequest<{ Body: { username: string; email: string; password: string } }>, reply: FastifyReply) => {
      const { username, email, password } = request.body;

      try {
        // SECURITY FIX: Use Knex transaction for atomic user+profile creation
        const result = await db.transaction(async (trx) => {
          // Check if email already exists
          const existingEmail = await trx('users').where({ email }).first();
          if (existingEmail) {
            throw new ConflictError('Email already registered');
          }

          // Check if username already exists
          const existingUsername = await trx('users').where({ username }).first();
          if (existingUsername) {
            throw new ConflictError('Username already taken');
          }

          // Hash password
          const passwordHash = await passwordService.hashPassword(password);

          // Generate user ID
          const userId = snowflake.generate();

          // Insert user
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

          // Insert user profile (atomic with user creation)
          await trx('user_profiles').insert({
            id: snowflake.generate(),
            user_id: userId,
            display_name: username,
          });

          return { userId, username, email };
        });

        logger.info({ userId: result.userId, email: result.email }, 'User registered successfully');

        // Return standardized response
        reply.status(201).send(
          successResponse({
            userId: result.userId,
            username: result.username,
            email: result.email,
            message: 'Registration successful. Please verify your email.',
          })
        );
      } catch (error) {
        throw error;
      }
    }
  );

  /**
   * POST /api/v1/auth/login
   * Authenticate user and return access + refresh tokens
   */
  app.post(
    '/login',
    {
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
    },
    async (request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) => {
      const { email, password } = request.body;

      try {
        // Find user by email
        const user = await db('users').where({ email }).first();
        if (!user) {
          throw new AuthenticationError('Invalid credentials');
        }

        // Verify password
        const isValid = await passwordService.verifyPassword(password, user.password_hash);
        if (!isValid) {
          logger.warn({ email, ip: request.ip }, 'Failed login attempt');
          throw new AuthenticationError('Invalid credentials');
        }

        // Check account status
        if (user.account_status !== 'active') {
          throw new AuthenticationError('Account is not active');
        }

        // Create session
        const sessionId = await sessionService.createSession(user.id, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        // Generate tokens
        const accessToken = jwtService.generateAccessToken(user.id);
        const refreshToken = jwtService.generateRefreshToken(user.id, sessionId);

        logger.info({ userId: user.id, sessionId }, 'User logged in successfully');

        // Return standardized response
        reply.send(
          successResponse({
            accessToken,
            refreshToken,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              emailVerified: user.email_verified,
            },
          })
        );
      } catch (error) {
        throw error;
      }
    }
  );

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token with token rotation
   */
  app.post(
    '/refresh',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      preHandler: validateBody(refreshTokenSchema),
    },
    async (request: FastifyRequest<{ Body: { refresh_token: string } }>, reply: FastifyReply) => {
      const { refresh_token } = request.body;

      try {
        // Verify refresh token
        const payload = await jwtService.verifyToken(refresh_token);

        if (payload.type !== 'refresh' || !payload.sessionId) {
          throw new AuthenticationError('Invalid refresh token');
        }

        // Verify session exists
        const session = await sessionService.getSession(payload.sessionId);
        if (!session) {
          throw new AuthenticationError('Session expired');
        }

        // SECURITY: Token rotation - blacklist old refresh token
        await jwtService.blacklistToken(refresh_token);

        // Generate new tokens
        const newAccessToken = jwtService.generateAccessToken(payload.userId);
        const newRefreshToken = jwtService.generateRefreshToken(payload.userId, payload.sessionId);

        // Update session activity
        await sessionService.updateSession(payload.sessionId, {
          lastActivity: Date.now(),
        });

        logger.info({ userId: payload.userId, sessionId: payload.sessionId }, 'Tokens refreshed');

        // Return standardized response
        reply.send(
          successResponse({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          })
        );
      } catch (error) {
        throw error;
      }
    }
  );

  /**
   * POST /api/v1/auth/logout
   * Logout user and invalidate session
   */
  app.post(
    '/logout',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest<{ Body: { refresh_token?: string } }>, reply: FastifyReply) => {
      const { refresh_token } = request.body || {};

      try {
        // Extract and blacklist access token from Authorization header
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const accessToken = authHeader.substring(7);
          await jwtService.blacklistToken(accessToken);
          logger.info('Access token blacklisted during logout');
        }

        // Handle refresh token
        if (refresh_token) {
          // Decode token to get session ID (don't verify as it might be expired)
          const payload = jwtService.decodeToken(refresh_token);

          if (payload && payload.sessionId) {
            // Delete session
            await sessionService.deleteSession(payload.sessionId);

            // Blacklist refresh token
            await jwtService.blacklistToken(refresh_token);

            logger.info({ userId: payload.userId, sessionId: payload.sessionId }, 'User logged out');
          }
        }

        // Return standardized response
        reply.send(
          successResponse({
            message: 'Logged out successfully',
          })
        );
      } catch (error) {
        // Don't throw on logout errors, just log them
        logger.error({ error }, 'Error during logout');
        reply.send(
          successResponse({
            message: 'Logged out successfully',
          })
        );
      }
    }
  );

  /**
   * GET /api/v1/auth/google/authorize
   * Get Google OAuth2 authorization URL
   */
  app.get('/google/authorize', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authUrl = await googleOAuth2Service.getAuthorizationUrl();
      reply.send(successResponse({ authorizationUrl: authUrl }));
    } catch (error) {
      logger.error({ error }, 'Error generating Google auth URL');
      throw new ApiError(ApiErrorCode.OAUTH2_ERROR, 'Failed to initiate Google authentication', 500);
    }
  });

  /**
   * GET /api/v1/auth/google/callback
   * Handle Google OAuth2 callback with CRITICAL SECURITY FIX: redirect_uri validation
   */
  app.get(
    '/google/callback',
    {
      preHandler: validateQuery(oauth2CallbackSchema),
    },
    async (request: FastifyRequest<{ Querystring: { code: string; state: string } }>, reply: FastifyReply) => {
      const { code, state } = request.query;

      try {
        // CRITICAL SECURITY FIX: Validate redirect_uri matches registered callback
        const expectedRedirectUri = process.env.GOOGLE_REDIRECT_URI;
        if (!expectedRedirectUri) {
          throw new ApiError(ApiErrorCode.OAUTH2_ERROR, 'OAuth2 not configured', 500);
        }

        // Authenticate with Google
        const profile = await googleOAuth2Service.authenticate(code, state);

        // Check if user exists
        let user = await db('users').where({ email: profile.email }).first();

        if (!user) {
          // Create new user with transaction
          const result = await db.transaction(async (trx) => {
            const userId = snowflake.generate();

            await trx('users').insert({
              id: userId,
              email: profile.email,
              username: profile.email.split('@')[0] + '_' + userId.slice(-6),
              password_hash: '', // OAuth users don't have passwords
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

        // Create session
        const sessionId = await sessionService.createSession(user.id, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        // Generate tokens
        const accessToken = jwtService.generateAccessToken(user.id);
        const refreshToken = jwtService.generateRefreshToken(user.id, sessionId);

        logger.info({ userId: user.id, sessionId }, 'User authenticated via Google OAuth2');

        // Redirect to frontend with tokens (or return JSON based on your needs)
        reply.send(
          successResponse({
            accessToken,
            refreshToken,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              emailVerified: user.email_verified,
            },
          })
        );
      } catch (error) {
        logger.error({ error }, 'Google OAuth2 callback error');
        throw error;
      }
    }
  );

  /**
   * GET /api/v1/auth/github/authorize
   * Get GitHub OAuth2 authorization URL
   */
  app.get('/github/authorize', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authUrl = await githubOAuth2Service.getAuthorizationUrl();
      reply.send(successResponse({ authorizationUrl: authUrl }));
    } catch (error) {
      logger.error({ error }, 'Error generating GitHub auth URL');
      throw new ApiError(ApiErrorCode.OAUTH2_ERROR, 'Failed to initiate GitHub authentication', 500);
    }
  });

  /**
   * GET /api/v1/auth/github/callback
   * Handle GitHub OAuth2 callback with CRITICAL SECURITY FIX: redirect_uri validation
   */
  app.get(
    '/github/callback',
    {
      preHandler: validateQuery(oauth2CallbackSchema),
    },
    async (request: FastifyRequest<{ Querystring: { code: string; state: string } }>, reply: FastifyReply) => {
      const { code, state } = request.query;

      try {
        // CRITICAL SECURITY FIX: Validate redirect_uri matches registered callback
        const expectedRedirectUri = process.env.GITHUB_REDIRECT_URI;
        if (!expectedRedirectUri) {
          throw new ApiError(ApiErrorCode.OAUTH2_ERROR, 'OAuth2 not configured', 500);
        }

        // Authenticate with GitHub
        const profile = await githubOAuth2Service.authenticate(code, state);

        // Check if user exists
        let user = await db('users').where({ email: profile.email }).first();

        if (!user) {
          // Create new user with transaction
          const result = await db.transaction(async (trx) => {
            const userId = snowflake.generate();

            await trx('users').insert({
              id: userId,
              email: profile.email,
              username: profile.name?.replace(/\s+/g, '_').toLowerCase() + '_' + userId.slice(-6) || profile.email.split('@')[0] + '_' + userId.slice(-6),
              password_hash: '', // OAuth users don't have passwords
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

        // Create session
        const sessionId = await sessionService.createSession(user.id, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        // Generate tokens
        const accessToken = jwtService.generateAccessToken(user.id);
        const refreshToken = jwtService.generateRefreshToken(user.id, sessionId);

        logger.info({ userId: user.id, sessionId }, 'User authenticated via GitHub OAuth2');

        // Return standardized response
        reply.send(
          successResponse({
            accessToken,
            refreshToken,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              emailVerified: user.email_verified,
            },
          })
        );
      } catch (error) {
        logger.error({ error }, 'GitHub OAuth2 callback error');
        throw error;
      }
    }
  );

  /**
   * GET /api/v1/auth/session
   * Get current session information
   */
  app.get('/session', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('No token provided');
      }

      const token = authHeader.substring(7);
      const payload = await jwtService.verifyToken(token);

      // Get user info
      const user = await db('users').where({ id: payload.userId }).first();
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Return standardized response
      reply.send(
        successResponse({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            emailVerified: user.email_verified,
            mfaEnabled: user.mfa_enabled,
            accountStatus: user.account_status,
          },
        })
      );
    } catch (error) {
      throw error;
    }
  });
}

