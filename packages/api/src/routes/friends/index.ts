/**
 * Friend Routes
 * Handles friend requests, friendships, and user blocking
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { successResponse } from '../../utils/errors';
import { friendService } from '../../services/friend/friend.service';

// Validation schemas
const sendRequestSchema = z.object({
  targetUserId: z.string().min(18).max(20),
});

const acceptRequestSchema = z.object({
  requesterId: z.string().min(18).max(20),
});

const rejectRequestSchema = z.object({
  requesterId: z.string().min(18).max(20),
});

const blockUserSchema = z.object({
  targetUserId: z.string().min(18).max(20),
});

export default async function friendRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', requireAuth);

  // ============================================
  // Friend Requests
  // ============================================

  /**
   * POST /api/v1/friends/request
   * Send a friend request
   */
  app.post(
    '/request',
    {
      preHandler: validateBody(sendRequestSchema),
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof sendRequestSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { targetUserId } = request.body;

      const connection = await friendService.sendFriendRequest(userId, targetUserId);

      return reply.send(successResponse({
        message: 'Friend request sent',
        connection,
      }));
    }
  );

  /**
   * POST /api/v1/friends/accept
   * Accept a friend request
   */
  app.post(
    '/accept',
    {
      preHandler: validateBody(acceptRequestSchema),
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof acceptRequestSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { requesterId } = request.body;

      await friendService.acceptFriendRequest(userId, requesterId);

      return reply.send(successResponse({
        message: 'Friend request accepted',
      }));
    }
  );

  /**
   * POST /api/v1/friends/reject
   * Reject a friend request
   */
  app.post(
    '/reject',
    {
      preHandler: validateBody(rejectRequestSchema),
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof rejectRequestSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { requesterId } = request.body;

      await friendService.rejectFriendRequest(userId, requesterId);

      return reply.send(successResponse({
        message: 'Friend request rejected',
      }));
    }
  );

  /**
   * POST /api/v1/friends/cancel
   * Cancel an outgoing friend request
   */
  app.post(
    '/cancel',
    {
      preHandler: validateBody(sendRequestSchema),
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof sendRequestSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { targetUserId } = request.body;

      await friendService.cancelFriendRequest(userId, targetUserId);

      return reply.send(successResponse({
        message: 'Friend request cancelled',
      }));
    }
  );

  // ============================================
  // Friends Management
  // ============================================

  /**
   * GET /api/v1/friends
   * Get all friends
   */
  app.get(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const friends = await friendService.getFriends(userId);
      return reply.send(successResponse({ friends }));
    }
  );

  /**
   * DELETE /api/v1/friends/:friendId
   * Remove a friend
   */
  app.delete(
    '/:friendId',
    async (request: FastifyRequest<{ Params: { friendId: string } }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { friendId } = request.params;

      await friendService.removeFriend(userId, friendId);

      return reply.send(successResponse({
        message: 'Friend removed',
      }));
    }
  );

  // ============================================
  // Pending Requests
  // ============================================

  /**
   * GET /api/v1/friends/pending
   * Get all pending friend requests
   */
  app.get(
    '/pending',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const requests = await friendService.getPendingRequests(userId);
      return reply.send(successResponse(requests));
    }
  );

  // ============================================
  // Blocking
  // ============================================

  /**
   * POST /api/v1/friends/block
   * Block a user
   */
  app.post(
    '/block',
    {
      preHandler: validateBody(blockUserSchema),
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof blockUserSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { targetUserId } = request.body;

      await friendService.blockUser(userId, targetUserId);

      return reply.send(successResponse({
        message: 'User blocked',
      }));
    }
  );

  /**
   * DELETE /api/v1/friends/block/:targetUserId
   * Unblock a user
   */
  app.delete(
    '/block/:targetUserId',
    async (request: FastifyRequest<{ Params: { targetUserId: string } }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { targetUserId } = request.params;

      await friendService.unblockUser(userId, targetUserId);

      return reply.send(successResponse({
        message: 'User unblocked',
      }));
    }
  );

  /**
   * GET /api/v1/friends/blocked
   * Get all blocked users
   */
  app.get(
    '/blocked',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const blocked = await friendService.getBlockedUsers(userId);
      return reply.send(successResponse({ blocked }));
    }
  );

  // ============================================
  // Search
  // ============================================

  /**
   * GET /api/v1/friends/search
   * Search for users to add as friend (searches all users)
   */
  app.get(
    '/search',
    async (request: FastifyRequest<{ Querystring: { q: string } }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { q } = request.query;

      const results = await friendService.searchUsers(userId, q);
      return reply.send(successResponse({ results }));
    }
  );

  /**
   * GET /api/v1/friends/search-list
   * Search within user's friends list only
   */
  app.get(
    '/search-list',
    async (request: FastifyRequest<{ Querystring: { q: string } }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { q } = request.query;

      const friends = await friendService.searchFriendsList(userId, q);
      return reply.send(successResponse({ friends }));
    }
  );

  /**
   * GET /api/v1/friends/status/:targetUserId
   * Get friendship status with a specific user
   */
  app.get(
    '/status/:targetUserId',
    async (request: FastifyRequest<{ Params: { targetUserId: string } }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { targetUserId } = request.params;

      const status = await friendService.getFriendshipStatus(userId, targetUserId);
      return reply.send(successResponse(status));
    }
  );
}
