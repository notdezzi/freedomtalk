/**
 * Main Router
 * Registers all API routes with versioning
 */

import { FastifyInstance } from 'fastify';
import authRoutes from './auth';
import userRoutes from './users';
import messageRoutes from './messages';

export default async function routes(app: FastifyInstance) {
  // API v1 routes
  await app.register(async (v1) => {
    // Auth routes: /api/v1/auth/*
    await v1.register(authRoutes, { prefix: '/auth' });

    // User routes: /api/v1/users/*
    await v1.register(userRoutes, { prefix: '/users' });

    // Message routes: /api/v1/messages/*
    await v1.register(messageRoutes, { prefix: '/messages' });
  }, { prefix: '/api/v1' });
}

