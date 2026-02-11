/**
 * Socket.io Server Setup
 * Real-time messaging and presence
 * FreedomTalk Backend - Discord Clone
 */

import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { generateToken, verifyToken } from '@/lib/jwt';

const prisma = new createClient();

// Redis Pub/Sub for cross-server support
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const redisPub = redis.duplicate();
const redisSub = redis.duplicate();

// Socket.io Server
const httpServer: HTTPServer = new Server();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling'],
});

// Channel message types
interface MessageData {
  channel_id: string;
  user_id: string;
  content: string;
  attachment_url?: string;
  reply_to_id?: string;
}

interface MessageEditData {
  message_id: string;
  content: string;
}

interface MessageDeleteData {
  message_id: string;
}

interface ReactionData {
  message_id: string;
  emoji: string;
}

interface TypingData {
  channel_id: string;
  user_id: string;
}

interface PresenceData {
  user_id: string;
  status: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
  custom_status?: string;
}

// Middleware: Auth
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token as string;

    if (!token) {
      return next(new Error('UNAUTHORIZED'));
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return next(new Error('INVALID_TOKEN'));
    }

    // Attach user to socket
    socket.data.user = {
      id: payload.userId,
      email: payload.email, // from token payload
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(new Error('AUTH_ERROR'));
  }
});

// Connection handler
io.on('connection', async (socket) => {
  try {
    const user = socket.data.user as { id: string; email: string };

    console.log(`User connected: ${user.id}`);

    // Get user's joined channels
    // TODO: Fetch user's active channels from database
    const userChannels = []; // await getUserActiveChannels(user.id);

    // Join all channels
    userChannels.forEach((channelId) => {
      socket.join(channelId);
    });

    // Send presence update to all channels
    userChannels.forEach((channelId) => {
      redisPub.publish(channelId, JSON.stringify({
        type: 'presence',
        data: {
          user_id: user.id,
          status: 'ONLINE',
          action: 'join',
        },
      }));
    });

    next();
  } catch (error) {
    console.error('Connection error:', error);
  }
});

// Disconnection handler
io.on('disconnection', async (socket) => {
  try {
    const user = socket.data.user as { id: string };

    console.log(`User disconnected: ${user.id}`);

    // Get user's joined channels
    const userChannels = []; // await getUserActiveChannels(user.id);

    // Send presence update to all channels
    userChannels.forEach((channelId) => {
      redisPub.publish(channelId, JSON.stringify({
        type: 'presence',
        data: {
          user_id: user.id,
          status: 'OFFLINE',
          action: 'leave',
        },
      }));
    });

    // Leave all channels
    userChannels.forEach((channelId) => {
      socket.leave(channelId);
    });

    next();
  } catch (error) {
    console.error('Disconnection error:', error);
  }
});

// Channel: Join
io.on('channel:join', async (socket, data: { channel_id: string }) => {
  try {
    const user = socket.data.user as { id: string };
    const { channel_id } = data;

    // TODO: Check if user is member of channel
    // const isMember = await isChannelMember(channel_id, user.id);

    socket.join(channel_id);

    // Notify others
    socket.to(channel_id).emit('channel:join', {
      user_id: user.id,
      channel_id,
      user: { id: user.id, email: (user as any).email },
    });

    next();
  } catch (error) {
    console.error('Channel join error:', error);
  }
});

// Channel: Leave
io.on('channel:leave', async (socket, data: { channel_id: string }) => {
  try {
    const user = socket.data.user as { id: string };
    const { channel_id } = data;

    socket.leave(channel_id);

    // Notify others
    socket.to(channel_id).emit('channel:leave', {
      user_id: user.id,
      channel_id,
    });

    next();
  } catch (error) {
    console.error('Channel leave error:', error);
  }
});

// Message: Send
io.on('message:send', async (socket, data: MessageData) => {
  try {
    const user = socket.data.user as { id: string };
    const { channel_id, content, attachment_url, reply_to_id } = data;

    // TODO: Create message in database
    // const message = await prisma.message.create({
    //   data: {
    //     channel_id,
    //     user_id: user.id,
    //     content,
    //     attachment_url,
    //     reply_to_id,
    //     created_at: new Date(),
    //     updated_at: new Date(),
    //   },
    // });

    // Broadcast to channel
    io.to(channel_id).emit('message:new', {
      id: 'uuid', // message.id,
      channel_id,
      user_id: user.id,
      content,
      attachment_url,
      reply_to_id,
      user: { id: user.id, username: (user as any).username },
      created_at: new Date().toISOString(),
    });

    next();
  } catch (error) {
    console.error('Send message error:', error);
  }
});

// Message: Edit
io.on('message:edit', async (socket, data: MessageEditData) => {
  try {
    const user = socket.data.user as { id: string };
    const { message_id, content } = data;

    // TODO: Check if user owns message
    // const message = await prisma.message.findUnique({
    //   where: { id: message_id },
    // });

    // if (message.user_id !== user.id) {
    //   return next(new Error('FORBIDDEN'));
    // }

    // TODO: Update message in database
    // await prisma.message.update({
    //   where: { id: message_id },
    //   data: { content, updated_at: new Date() },
    // });

    // Broadcast to channel
    io.to(channel_id).emit('message:edit', {
      message_id,
      content,
      updated_at: new Date().toISOString(),
    });

    next();
  } catch (error) {
    console.error('Edit message error:', error);
  }
});

// Message: Delete
io.on('message:delete', async (socket, data: MessageDeleteData) => {
  try {
    const user = socket.data.user as { id: string };
    const { message_id } = data;

    // TODO: Check if user owns message or has permission
    // const message = await prisma.message.findUnique({
    //   where: { id: message_id },
    // });

    // TODO: Delete message from database
    // await prisma.message.delete({
    //   where: { id: message_id },
    // });

    // Get channel_id from message
    const channelId = ''; // await getMessageChannelId(message_id);

    // Broadcast to channel
    io.to(channelId).emit('message:delete', {
      message_id,
      channel_id: channelId,
    });

    next();
  } catch (error) {
    console.error('Delete message error:', error);
  }
});

// Reaction: Add
io.on('reaction:add', async (socket, data: ReactionData) => {
  try {
    const user = socket.data.user as { id: string };
    const { message_id, emoji } = data;

    // TODO: Check if reaction exists
    // TODO: Create reaction in database
    // const reaction = await prisma.messageReaction.create({
    //   data: {
    //     message_id,
    //     user_id: user.id,
    //     emoji,
    //     created_at: new Date(),
    //   },
    // });

    // Broadcast to channel
    const channelId = ''; // await getMessageChannelId(message_id);
    io.to(channelId).emit('reaction:add', {
      reaction_id: 'uuid', // reaction.id
      message_id,
      emoji,
      user_id: user.id,
      user: { id: user.id, username: (user as any).username },
      created_at: new Date().toISOString(),
    });

    next();
  } catch (error) {
    console.error('Add reaction error:', error);
  }
});

// Reaction: Remove
io.on('reaction:remove', async (socket, data: { message_id: string, emoji: string }) => {
  try {
    const user = socket.data.user as { id: string };
    const { message_id, emoji } = data;

    // TODO: Delete reaction from database
    // await prisma.messageReaction.deleteMany({
    //   where: { message_id, user_id, emoji },
    // });

    const channelId = ''; // await getMessageChannelId(message_id);
    io.to(channelId).emit('reaction:remove', {
      message_id,
      emoji,
      user_id: user.id,
    });

    next();
  } catch (error) {
    console.error('Remove reaction error:', error);
  }
});

// Typing: Start
io.on('typing:start', async (socket, data: TypingData) => {
  try {
    const user = socket.data.user as { id: string };
    const { channel_id } = data;

    socket.to(channel_id).emit('typing:start', {
      user_id: user.id,
      user: { id: user.id, username: (user as any).username },
      channel_id,
    });

    next();
  } catch (error) {
    console.error('Typing start error:', error);
  }
});

// Typing: Stop
io.on('typing:stop', async (socket, data: TypingData) => {
  try {
    const user = socket.data.user as { id: string };
    const { channel_id } = data;

    socket.to(channel_id).emit('typing:stop', {
      user_id: user.id,
      channel_id,
    });

    next();
  } catch (error) {
    console.error('Typing stop error:', error);
  }
});

// Presence: Update
io.on('presence:update', async (socket, data: PresenceData) => {
  try {
    const user = socket.data.user as { id: string };
    const { status, custom_status } = data;

    // TODO: Update user status in database
    // await prisma.user.update({
    //   where: { id: user.id },
    //   data: { status, custom_status, updated_at: new Date() },
    // });

    // Get user's channels
    const userChannels = []; // await getUserActiveChannels(user.id);

    // Broadcast to all channels
    userChannels.forEach((channelId) => {
      redisPub.publish(channelId, JSON.stringify({
        type: 'presence',
        data: {
          user_id: user.id,
          status,
          custom_status,
          action: 'update',
        },
      }));
    });

    next();
  } catch (error) {
    console.error('Presence update error:', error);
  }
});

// Subscribe to Redis for cross-server presence
redisSub.subscribe('presence', (message: string) => {
  try {
    const data = JSON.parse(message);

    // Broadcast to all connected clients in the room
    io.emit('presence:broadcast', data);
  } catch (error) {
    console.error('Redis subscription error:', error);
  }
});

// Export io for Next.js API integration
export { io, httpServer };
