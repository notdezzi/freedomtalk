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
import serverRoutes from './servers';
import channelRoutes from './channels';
import permissionRoutes from './permissions';
import voiceRoutes from './voice';
import searchRoutes from './search';
import discoveryRoutes from './discovery';
import friendRoutes from './friends';
import webhookRoutes from './webhooks.routes';

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

    // Server routes: /api/v1/servers/*
    await v1.register(serverRoutes, { prefix: '/servers' });

    // Channel routes: /api/v1/channels/* and /api/v1/servers/:serverId/channels/*
    await v1.register(channelRoutes);

    // Permission routes: /api/v1/channels/:channelId/permissions/*
    await v1.register(permissionRoutes);

    // Voice routes: /api/v1/voice/*
    await v1.register(voiceRoutes, { prefix: '/voice' });

    // Search routes: /api/v1/search/*
    await v1.register(searchRoutes, { prefix: '/search' });

    // Discovery routes: /api/v1/discovery/*
    await v1.register(discoveryRoutes, { prefix: '/discovery' });

    // Friend routes: /api/v1/friends/*
    await v1.register(friendRoutes, { prefix: '/friends' });

    // Webhook routes: /api/v1/servers/:serverId/webhooks/* and /api/v1/webhooks/*
    await v1.register(webhookRoutes);

    // WebSocket routes: /api/v1/websocket/*
    await v1.register(websocketRoutes, { prefix: '/websocket' });
  }, { prefix: '/api/v1' });
}

