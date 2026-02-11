/**
 * Main API Entry Point
 * All Routes
 * FreedomTalk Backend - Discord Clone
 */

import { NextRequest, NextResponse } from 'next/server';
import { authRoutes } from '@/auth/routes';
import { userRoutes } from '@/users/routes';

export async function GET(req: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    name: 'FreedomTalk API',
    version: '1.0.0',
    status: 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      servers: '/api/v1/servers',
      channels: '/api/v1/channels',
      messages: '/api/v1/messages',
      voice: '/api/v1/voice',
    files: '/api/v1/files',
      dm: '/api/v1/dm',
      friends: '/api/v1/friends',
    },
  });
}

// Mount all routes under their base paths
export const authRoutes = authRoutes;
export const userRoutes = userRoutes;

// TODO: Add server, channel, message routes
// TODO: Add voice/video routes
// TODO: Add file upload routes
// TODO: Add direct message routes
// TODO: Add friend system routes
