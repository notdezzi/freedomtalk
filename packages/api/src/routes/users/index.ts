/**
 * User Routes
 * Handles user profile management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { updateProfileSchema } from '@freedomtalk/shared';
import { validateBody } from '../../middleware/validation.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { successResponse } from '../../utils/errors';
import { NotFoundError } from '../../types/api.types';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { snowflake } from '../../utils/snowflake';

export default async function userRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/users/@me
   * Get current user's profile
   */
  app.get(
    '/@me',
    {
      schema: {
        description: 'Get current authenticated user profile',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'User profile retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  emailVerified: { type: 'boolean' },
                  mfaEnabled: { type: 'boolean' },
                  accountStatus: { type: 'string' },
                  profile: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      displayName: { type: 'string' },
                      bio: { type: 'string' },
                      pronouns: { type: 'string' },
                      avatarUrl: { type: 'string' },
                      bannerUrl: { type: 'string' },
                      customStatus: { type: 'string' },
                    },
                  },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
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
          max: 30,
          timeWindow: '1 minute',
        },
      },
      preHandler: requireAuth,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;

        // Get user data
        const user = await db('users').where({ id: userId }).first();
        if (!user) {
          throw new NotFoundError('User');
        }

        // Get user profile
        const profile = await db('user_profiles').where({ user_id: userId }).first();

        // Return standardized response
        reply.send(
          successResponse({
            id: user.id,
            username: user.username,
            email: user.email,
            emailVerified: user.email_verified,
            mfaEnabled: user.mfa_enabled,
            accountStatus: user.account_status,
            profile: profile ? {
              displayName: profile.display_name,
              bio: profile.bio,
              pronouns: profile.pronouns,
              avatarUrl: profile.avatar_url,
              bannerUrl: profile.banner_url,
              customStatus: profile.custom_status,
            } : null,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
          })
        );
      } catch (error) {
        throw error;
      }
    }
  );

  /**
   * PUT /api/v1/users/@me
   * Update current user's profile with transaction-based updates
   */
  app.put(
    '/@me',
    {
      schema: {
        description: 'Update current authenticated user profile',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            display_name: { type: 'string', minLength: 1, maxLength: 100 },
            bio: { type: 'string', maxLength: 500 },
            pronouns: { type: 'string', maxLength: 50 },
            avatar_url: { type: 'string', format: 'uri' },
            banner_url: { type: 'string', format: 'uri' },
            custom_status: { type: 'string', maxLength: 200 },
          },
        },
        response: {
          200: {
            description: 'Profile updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  profile: {
                    type: 'object',
                    properties: {
                      displayName: { type: 'string' },
                      bio: { type: 'string' },
                      pronouns: { type: 'string' },
                      avatarUrl: { type: 'string' },
                      bannerUrl: { type: 'string' },
                      customStatus: { type: 'string' },
                    },
                  },
                  message: { type: 'string' },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
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
          max: 10,
          timeWindow: '1 minute',
        },
      },
      preHandler: [requireAuth, validateBody(updateProfileSchema)],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).user.id;
        const updates = request.body as {
          display_name?: string;
          bio?: string;
          pronouns?: string;
          avatar_url?: string;
          banner_url?: string;
          custom_status?: string;
        };

        // Use transaction for atomic update
        const result = await db.transaction(async (trx) => {
          // Verify user exists
          const user = await trx('users').where({ id: userId }).first();
          if (!user) {
            throw new NotFoundError('User');
          }

          // Check if profile exists
          const existingProfile = await trx('user_profiles').where({ user_id: userId }).first();

          if (existingProfile) {
            // Update existing profile
            await trx('user_profiles')
              .where({ user_id: userId })
              .update({
                ...updates,
                updated_at: new Date(),
              });
          } else {
            // Create profile if it doesn't exist
            await trx('user_profiles').insert({
              id: snowflake.generate(),
              user_id: userId,
              ...updates,
            });
          }

          // Update user's updated_at timestamp
          await trx('users')
            .where({ id: userId })
            .update({
              updated_at: new Date(),
            });

          // Return updated profile
          return await trx('user_profiles').where({ user_id: userId }).first();
        });

        logger.info({ userId }, 'User profile updated');

        // Return standardized response
        reply.send(
          successResponse({
            profile: {
              displayName: result.display_name,
              bio: result.bio,
              pronouns: result.pronouns,
              avatarUrl: result.avatar_url,
              bannerUrl: result.banner_url,
              customStatus: result.custom_status,
            },
            message: 'Profile updated successfully',
          })
        );
      } catch (error) {
        throw error;
      }
    }
  );
}

