/**
 * Main Router
 * Registers all API routes with versioning
 */

import { FastifyInstance } from 'fastify';
import authRoutes from './auth';
import userRoutes from './users';
import messageRoutes from './messages';
import websocketRoutes from './websocket';
import reactionRoutes from './reactions.routes';
import attachmentRoutes from './attachments.routes';
import dmRoutes from './dm.routes';

export default async function routes(app: FastifyInstance) {
  // API v1 routes
  await app.register(async (v1) => {
    // Auth routes: /api/v1/auth/*
    await v1.register(authRoutes, { prefix: '/auth' });

    // User routes: /api/v1/users/*
    await v1.register(userRoutes, { prefix: '/users' });

    // Message routes: /api/v1/messages/*
    await v1.register(messageRoutes, { prefix: '/messages' });

    // Reaction routes: /api/v1/messages/* (nested under messages)
    await v1.register(reactionRoutes, { prefix: '/messages' });

    // Attachment routes: /api/v1/messages/* (nested under messages)
    await v1.register(attachmentRoutes, { prefix: '/messages' });

    // DM routes: /api/v1/users/@me/channels and /api/v1/channels/*
    await v1.register(dmRoutes);

    // WebSocket routes: /api/v1/websocket/*
    await v1.register(websocketRoutes, { prefix: '/websocket' });
  }, { prefix: '/api/v1' });
}

