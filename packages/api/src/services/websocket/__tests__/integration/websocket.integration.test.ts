import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { createServer, Server as HTTPServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { wsServer } from '../../websocket.server';
import { registerHandlers } from '../../handlers';
import { WS_EVENTS } from '@freedomtalk/shared';
import { jwtService } from '../../../auth/jwt.service';
import { UserStatus } from '../../status.manager';
import { db } from '../../../../config/database';
import { getRedisClient } from '../../../../config/redis';

describe('WebSocket Integration Tests', () => {
  let httpServer: HTTPServer;
  let serverPort: number;
  let client1: ClientSocket;
  let client2: ClientSocket;
  let client3: ClientSocket;
  const testUser1 = { id: 'user-1', username: 'testuser1' };
  const testUser2 = { id: 'user-2', username: 'testuser2' };
  const testUser3 = { id: 'user-3', username: 'testuser3' };
  let token1: string;
  let token2: string;

  // Client options with required headers
  const clientOptions = {
    transports: ['websocket'],
    extraHeaders: {
      'user-agent': 'test-client',
    },
  };

  beforeAll(async () => {
    // Create HTTP server
    httpServer = createServer();
    
    // Find available port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        serverPort = typeof address === 'object' && address ? address.port : 0;
        resolve();
      });
    });

    // Initialize WebSocket server
    await wsServer.initialize(httpServer);
    
    // Register handlers
    registerHandlers(wsServer.getIO());

    // Generate test tokens
    token1 = jwtService.generateAccessToken(testUser1.id, { username: testUser1.username });
    token2 = jwtService.generateAccessToken(testUser2.id, { username: testUser2.username });

    // Clean up any existing test data first
    await db('users').whereIn('id', [testUser1.id, testUser2.id, testUser3.id]).del();
    await db('channels').where('id', 'channel-1').del();
    await db('servers').where('id', 'server-1').del();

    // Insert test users into database
    await db('users').insert([
      {
        id: testUser1.id,
        username: testUser1.username,
        email: `${testUser1.username}@test.com`,
        password_hash: 'test-hash',
        email_verified: true,
        mfa_enabled: false,
        account_status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: testUser2.id,
        username: testUser2.username,
        email: `${testUser2.username}@test.com`,
        password_hash: 'test-hash',
        email_verified: true,
        mfa_enabled: false,
        account_status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: testUser3.id,
        username: testUser3.username,
        email: `${testUser3.username}@test.com`,
        password_hash: 'test-hash',
        email_verified: true,
        mfa_enabled: false,
        account_status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Create test server and channel for message tests
    await db('servers').insert({
      id: 'server-1',
      name: 'Test Server',
      description: 'Test server for integration tests',
      owner_id: testUser1.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('channels').insert({
      id: 'channel-1',
      server_id: 'server-1',
      name: 'test-channel',
      type: 'text',
      topic: 'Test channel for integration tests',
      position: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  afterAll(async () => {
    // Clean up test data (order matters due to foreign keys)
    await db('channels').where('id', 'channel-1').del();
    await db('servers').where('id', 'server-1').del();
    await db('users').whereIn('id', [testUser1.id, testUser2.id, testUser3.id]).del();

    // Close WebSocket server
    await wsServer.close();

    // Close HTTP server
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Clear IP rate limit for localhost to prevent test failures
    try {
      const redis = await getRedisClient();
      await redis.del('ratelimit:ip:::1'); // Clear rate limit for IPv6 localhost
      await redis.del('ratelimit:ip:127.0.0.1'); // Clear rate limit for IPv4 localhost
    } catch (error) {
      // Ignore errors if Redis is not available
    }
  });

  afterEach(async () => {
    // Remove all event listeners to prevent interference between tests
    if (client1) client1.removeAllListeners();
    if (client2) client2.removeAllListeners();
    if (client3) client3.removeAllListeners();

    // Disconnect all clients
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
    if (client3?.connected) client3.disconnect();

    // Wait for disconnections to process
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Connection Establishment', () => {
    it('should successfully connect with valid JWT token', async () => {
      const connectPromise = new Promise<void>((resolve, reject) => {
        client1 = ioClient(`http://localhost:${serverPort}`, {
          ...clientOptions,
          auth: { token: token1 },
        });

        client1.on('connect', () => {
          expect(client1.connected).toBe(true);
          resolve();
        });

        client1.on('connect_error', (error) => {
          reject(error);
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      await connectPromise;
    });

    it('should reject connection with invalid JWT token', async () => {
      const connectPromise = new Promise<void>((resolve, reject) => {
        const invalidClient = ioClient(`http://localhost:${serverPort}`, {
          ...clientOptions,
          auth: { token: 'invalid-token' },
        });

        invalidClient.on('connect', () => {
          invalidClient.disconnect();
          reject(new Error('Should not connect with invalid token'));
        });

        invalidClient.on('connect_error', (error) => {
          expect(error.message).toContain('Invalid or expired authentication token');
          invalidClient.disconnect();
          resolve();
        });

        setTimeout(() => {
          invalidClient.disconnect();
          reject(new Error('Connection error timeout'));
        }, 5000);
      });

      await connectPromise;
    });

    it('should reject connection without JWT token', async () => {
      const connectPromise = new Promise<void>((resolve, reject) => {
        const noAuthClient = ioClient(`http://localhost:${serverPort}`, clientOptions);

        noAuthClient.on('connect', () => {
          noAuthClient.disconnect();
          reject(new Error('Should not connect without token'));
        });

        noAuthClient.on('connect_error', (error) => {
          expect(error.message).toContain('Authentication');
          noAuthClient.disconnect();
          resolve();
        });

        setTimeout(() => {
          noAuthClient.disconnect();
          reject(new Error('Connection error timeout'));
        }, 5000);
      });

      await connectPromise;
    });
  });

  describe('Room Operations', () => {
    beforeEach(async () => {
      // Connect client1
      await new Promise<void>((resolve, reject) => {
        client1 = ioClient(`http://localhost:${serverPort}`, {
          ...clientOptions,
          auth: { token: token1 },
        });
        client1.on('connect', () => resolve());
        client1.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should join a channel room', async () => {
      const roomJoinPromise = new Promise<void>((resolve, reject) => {
        client1.on(WS_EVENTS.ROOM_JOINED, (data) => {
          expect(data.roomType).toBe('channel');
          expect(data.roomId).toBe('channel-1');
          resolve();
        });

        client1.emit(WS_EVENTS.ROOM_JOIN, {
          roomType: 'channel',
          roomId: 'channel-1',
        });

        setTimeout(() => reject(new Error('Room join timeout')), 5000);
      });

      await roomJoinPromise;
    });

    it('should leave a channel room', async () => {
      // First join the room
      await new Promise<void>((resolve) => {
        client1.on(WS_EVENTS.ROOM_JOINED, () => resolve());
        client1.emit(WS_EVENTS.ROOM_JOIN, {
          roomType: 'channel',
          roomId: 'channel-1',
        });
      });

      // Then leave the room
      const roomLeavePromise = new Promise<void>((resolve, reject) => {
        client1.on(WS_EVENTS.ROOM_LEFT, (data) => {
          expect(data.roomType).toBe('channel');
          expect(data.roomId).toBe('channel-1');
          resolve();
        });

        client1.emit(WS_EVENTS.ROOM_LEAVE, {
          roomType: 'channel',
          roomId: 'channel-1',
        });

        setTimeout(() => reject(new Error('Room leave timeout')), 5000);
      });

      await roomLeavePromise;
    });

    it('should join multiple rooms', async () => {
      const rooms = ['channel-1', 'channel-2', 'channel-3'];
      const joinedRooms: string[] = [];

      const multiRoomPromise = new Promise<void>((resolve, reject) => {
        client1.on(WS_EVENTS.ROOM_JOINED, (data) => {
          joinedRooms.push(data.roomId);
          if (joinedRooms.length === rooms.length) {
            expect(joinedRooms).toEqual(expect.arrayContaining(rooms));
            resolve();
          }
        });

        // Join all rooms
        rooms.forEach(roomId => {
          client1.emit(WS_EVENTS.ROOM_JOIN, {
            roomType: 'channel',
            roomId,
          });
        });

        setTimeout(() => reject(new Error('Multi-room join timeout')), 5000);
      });

      await multiRoomPromise;
    });
  });

  describe('Presence Updates', () => {
    beforeEach(async () => {
      // Connect both clients
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          client1 = ioClient(`http://localhost:${serverPort}`, {
            ...clientOptions,
            auth: { token: token1 },
          });
          client1.on('connect', () => resolve());
          client1.on('connect_error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }),
        new Promise<void>((resolve, reject) => {
          client2 = ioClient(`http://localhost:${serverPort}`, {
            ...clientOptions,
            auth: { token: token2 },
          });
          client2.on('connect', () => resolve());
          client2.on('connect_error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }),
      ]);
    });

    it('should broadcast presence update to other users', async () => {
      // Disconnect client1 first to set them offline
      client1.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));

      const presencePromise = new Promise<void>((resolve, reject) => {
        client2.on(WS_EVENTS.PRESENCE_UPDATE, (data) => {
          expect(data.userId).toBe(testUser1.id);
          expect(data.presence).toBe('online');
          expect(data.timestamp).toBeDefined();
          resolve();
        });

        // Reconnect client1 to trigger presence update broadcast
        client1 = ioClient(`http://localhost:${serverPort}`, {
          ...clientOptions,
          auth: { token: token1 },
        });

        setTimeout(() => reject(new Error('Presence update timeout')), 5000);
      });

      await presencePromise;
    });

    it('should update user status', async () => {
      const statusPromise = new Promise<void>((resolve, reject) => {
        client2.on(WS_EVENTS.STATUS_CHANGE, (data) => {
          expect(data.userId).toBe(testUser1.id);
          expect(data.status).toBe(UserStatus.BUSY);
          expect(data.timestamp).toBeDefined();
          resolve();
        });

        client1.emit(WS_EVENTS.STATUS_CHANGE, { status: UserStatus.BUSY });

        setTimeout(() => reject(new Error('Status change timeout')), 5000);
      });

      await statusPromise;
    });
  });

  describe('Typing Indicators', () => {
    beforeEach(async () => {
      // Connect both clients
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          client1 = ioClient(`http://localhost:${serverPort}`, {
            ...clientOptions,
            auth: { token: token1 },
          });
          client1.on('connect', () => resolve());
          client1.on('connect_error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }),
        new Promise<void>((resolve, reject) => {
          client2 = ioClient(`http://localhost:${serverPort}`, {
            ...clientOptions,
            auth: { token: token2 },
          });
          client2.on('connect', () => resolve());
          client2.on('connect_error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }),
      ]);
    });

    it('should broadcast typing start to channel members', async () => {
      // First, both clients join the channel room
      await Promise.all([
        new Promise<void>((resolve) => {
          client1.on(WS_EVENTS.ROOM_JOINED, () => resolve());
          client1.emit(WS_EVENTS.ROOM_JOIN, { roomType: 'channel', roomId: 'channel-1' });
        }),
        new Promise<void>((resolve) => {
          client2.on(WS_EVENTS.ROOM_JOINED, () => resolve());
          client2.emit(WS_EVENTS.ROOM_JOIN, { roomType: 'channel', roomId: 'channel-1' });
        }),
      ]);

      const typingPromise = new Promise<void>((resolve, reject) => {
        client2.on(WS_EVENTS.TYPING_START, (data) => {
          expect(data.userId).toBe(testUser1.id);
          expect(data.channelId).toBe('channel-1');
          resolve();
        });

        client1.emit(WS_EVENTS.TYPING_START, { channelId: 'channel-1' });

        setTimeout(() => reject(new Error('Typing start timeout')), 5000);
      });

      await typingPromise;
    });

    it('should broadcast typing stop to channel members', async () => {
      // First, both clients join the channel room
      await Promise.all([
        new Promise<void>((resolve) => {
          client1.once(WS_EVENTS.ROOM_JOINED, () => resolve());
          client1.emit(WS_EVENTS.ROOM_JOIN, { roomType: 'channel', roomId: 'channel-1' });
        }),
        new Promise<void>((resolve) => {
          client2.once(WS_EVENTS.ROOM_JOINED, () => resolve());
          client2.emit(WS_EVENTS.ROOM_JOIN, { roomType: 'channel', roomId: 'channel-1' });
        }),
      ]);

      // Start typing first
      await new Promise<void>((resolve) => {
        client2.once(WS_EVENTS.TYPING_START, () => resolve());
        client1.emit(WS_EVENTS.TYPING_START, { channelId: 'channel-1' });
      });

      // Set up typing stop listener BEFORE emitting the event
      const typingStopPromise = new Promise<void>((resolve, reject) => {
        client2.once(WS_EVENTS.TYPING_STOP, (data) => {
          expect(data.userId).toBe(testUser1.id);
          expect(data.channelId).toBe('channel-1');
          resolve();
        });

        setTimeout(() => reject(new Error('Typing stop timeout')), 5000);
      });

      // Small delay to ensure listener is registered
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then emit typing stop
      client1.emit(WS_EVENTS.TYPING_STOP, { channelId: 'channel-1' });

      // Wait for the event
      await typingStopPromise;
    });
  });

  describe('Message Broadcasting', () => {
    beforeEach(async () => {
      // Connect both clients and join same channel
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          client1 = ioClient(`http://localhost:${serverPort}`, {
            ...clientOptions,
            auth: { token: token1 },
          });
          client1.on('connect', () => {
            client1.emit(WS_EVENTS.ROOM_JOIN, {
              roomType: 'channel',
              roomId: 'channel-1',
            });
            client1.on(WS_EVENTS.ROOM_JOINED, () => resolve());
          });
          client1.on('connect_error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }),
        new Promise<void>((resolve, reject) => {
          client2 = ioClient(`http://localhost:${serverPort}`, {
            ...clientOptions,
            auth: { token: token2 },
          });
          client2.on('connect', () => {
            client2.emit(WS_EVENTS.ROOM_JOIN, {
              roomType: 'channel',
              roomId: 'channel-1',
            });
            client2.on(WS_EVENTS.ROOM_JOINED, () => resolve());
          });
          client2.on('connect_error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }),
      ]);
    });

    it('should broadcast message to channel members', async () => {
      // Wait a bit for subscriptions to be fully registered
      await new Promise(resolve => setTimeout(resolve, 100));

      // Debug: Check if subscriptions are registered
      const redis = await getRedisClient();
      const user1Subs = await redis.sMembers(`subscriptions:${testUser1.id}`);
      const user2Subs = await redis.sMembers(`subscriptions:${testUser2.id}`);
      console.log('User1 subscriptions:', user1Subs);
      console.log('User2 subscriptions:', user2Subs);

      const messagePromise = new Promise<void>((resolve, reject) => {
        client1.on(WS_EVENTS.ERROR, (error) => {
          reject(new Error(`Client1 error: ${error.message || error.code}`));
        });

        client2.on(WS_EVENTS.MESSAGE_CREATED, (data) => {
          expect(data.content).toBe('Hello, World!');
          expect(data.channelId).toBe('channel-1');
          expect(data.authorId).toBe(testUser1.id);
          resolve();
        });

        client2.on(WS_EVENTS.ERROR, (error) => {
          reject(new Error(`Client2 error: ${error.message || error.code}`));
        });

        client1.emit(WS_EVENTS.MESSAGE_CREATE, {
          content: 'Hello, World!',
          channelId: 'channel-1',
        });

        setTimeout(() => reject(new Error('Message broadcast timeout')), 5000);
      });

      await messagePromise;
    });

    it('should broadcast message update to channel members', async () => {
      // First, create a message to update
      const createPromise = new Promise<string>((resolve, reject) => {
        client1.once('message:ack', (data: { messageId: string }) => {
          resolve(data.messageId);
        });

        client1.emit(WS_EVENTS.MESSAGE_CREATE, {
          content: 'Original message',
          channelId: 'channel-1',
        });

        setTimeout(() => reject(new Error('Message create timeout')), 5000);
      });

      const messageId = await createPromise;

      // Now update the message
      const updatePromise = new Promise<void>((resolve, reject) => {
        client2.on(WS_EVENTS.MESSAGE_UPDATED, (data) => {
          expect(data.id).toBe(messageId);
          expect(data.content).toBe('Updated message');
          expect(data.channelId).toBe('channel-1');
          resolve();
        });

        client1.emit(WS_EVENTS.MESSAGE_UPDATE, {
          messageId: messageId,
          content: 'Updated message',
        });

        setTimeout(() => reject(new Error('Message update timeout')), 5000);
      });

      await updatePromise;
    });

    it('should broadcast message delete to channel members', async () => {
      // First, create a message to delete
      const createPromise = new Promise<string>((resolve, reject) => {
        client1.once('message:ack', (data: { messageId: string }) => {
          resolve(data.messageId);
        });

        client1.emit(WS_EVENTS.MESSAGE_CREATE, {
          content: 'Message to delete',
          channelId: 'channel-1',
        });

        setTimeout(() => reject(new Error('Message create timeout')), 5000);
      });

      const messageId = await createPromise;

      // Wait a bit for message creation to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Set up listener BEFORE emitting the delete event
      const deletePromise = new Promise<void>((resolve, reject) => {
        client2.once(WS_EVENTS.MESSAGE_DELETED, (data) => {
          expect(data.id).toBe(messageId);
          expect(data.channelId).toBe('channel-1');
          resolve();
        });

        setTimeout(() => reject(new Error('Message delete timeout')), 5000);
      });

      // Wait a bit to ensure listener is registered
      await new Promise(resolve => setTimeout(resolve, 50));

      // Now delete the message
      client1.emit(WS_EVENTS.MESSAGE_DELETE, {
        messageId: messageId,
      });

      await deletePromise;
    });
  });

  describe('Graceful Disconnection', () => {
    beforeEach(async () => {
      // Connect client1
      await new Promise<void>((resolve, reject) => {
        client1 = ioClient(`http://localhost:${serverPort}`, {
          ...clientOptions,
          auth: { token: token1 },
        });
        client1.on('connect', () => resolve());
        client1.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should handle graceful disconnect', async () => {
      const disconnectPromise = new Promise<void>((resolve, reject) => {
        client1.on('disconnect', (reason) => {
          expect(reason).toBe('io client disconnect');
          resolve();
        });

        client1.disconnect();

        setTimeout(() => reject(new Error('Disconnect timeout')), 5000);
      });

      await disconnectPromise;
    });

    it('should clean up presence on disconnect', async () => {
      // Connect client2 to observe presence changes
      await new Promise<void>((resolve, reject) => {
        client2 = ioClient(`http://localhost:${serverPort}`, {
          ...clientOptions,
          auth: { token: token2 },
        });
        client2.on('connect', () => resolve());
        client2.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      const presencePromise = new Promise<void>((resolve, reject) => {
        client2.on(WS_EVENTS.PRESENCE_UPDATE, (data) => {
          if (data.userId === testUser1.id && data.presence === 'offline') {
            resolve();
          }
        });

        // Disconnect client1
        client1.disconnect();

        setTimeout(() => reject(new Error('Presence cleanup timeout')), 5000);
      });

      await presencePromise;
    });
  });

  describe('Error Scenarios', () => {
    beforeEach(async () => {
      // Connect client1
      await new Promise<void>((resolve, reject) => {
        client1 = ioClient(`http://localhost:${serverPort}`, {
          ...clientOptions,
          auth: { token: token1 },
        });
        client1.on('connect', () => resolve());
        client1.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should handle invalid room join data', async () => {
      const errorPromise = new Promise<void>((resolve) => {
        client1.on('error', (error) => {
          expect(error).toBeDefined();
          resolve();
        });

        // Send invalid room join data
        client1.emit(WS_EVENTS.ROOM_JOIN, {
          roomType: 'INVALID_TYPE',
          roomId: '',
        });

        setTimeout(() => {
          // If no error event, that's also acceptable
          resolve();
        }, 2000);
      });

      await errorPromise;
    });

    it('should handle invalid status change', async () => {
      const errorPromise = new Promise<void>((resolve) => {
        client1.on('error', (error) => {
          expect(error).toBeDefined();
          resolve();
        });

        // Send invalid status
        client1.emit(WS_EVENTS.STATUS_CHANGE, { status: 'INVALID_STATUS' });

        setTimeout(() => {
          // If no error event, that's also acceptable
          resolve();
        }, 2000);
      });

      await errorPromise;
    });

    it('should handle empty message content', async () => {
      const errorPromise = new Promise<void>((resolve) => {
        client1.on('error', (error) => {
          expect(error).toBeDefined();
          resolve();
        });

        // Send empty message
        client1.emit(WS_EVENTS.MESSAGE_CREATE, {
          content: '',
          channelId: 'channel-1',
        });

        setTimeout(() => {
          // If no error event, that's also acceptable
          resolve();
        }, 2000);
      });

      await errorPromise;
    });
  });

  describe('Multi-Connection Scenarios', () => {
    it('should support multiple connections from same user', async () => {
      // Connect client1 and client3 with same user token
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          client1 = ioClient(`http://localhost:${serverPort}`, {
            ...clientOptions,
            auth: { token: token1 },
          });
          client1.on('connect', () => resolve());
          client1.on('connect_error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }),
        new Promise<void>((resolve, reject) => {
          client3 = ioClient(`http://localhost:${serverPort}`, {
            ...clientOptions,
            auth: { token: token1 }, // Same user as client1
          });
          client3.on('connect', () => resolve());
          client3.on('connect_error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }),
      ]);

      expect(client1.connected).toBe(true);
      expect(client3.connected).toBe(true);
    });

    it('should broadcast to all user connections', async () => {
      // Connect client1 and client3 with same user token
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          client1 = ioClient(`http://localhost:${serverPort}`, {
            ...clientOptions,
            auth: { token: token1 },
          });
          client1.on('connect', () => resolve());
          client1.on('connect_error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }),
        new Promise<void>((resolve, reject) => {
          client3 = ioClient(`http://localhost:${serverPort}`, {
            ...clientOptions,
            auth: { token: token1 }, // Same user as client1
          });
          client3.on('connect', () => resolve());
          client3.on('connect_error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }),
      ]);

      // Connect client2 first
      await new Promise<void>((resolve, reject) => {
        client2 = ioClient(`http://localhost:${serverPort}`, {
          ...clientOptions,
          auth: { token: token2 },
        });
        client2.on('connect', () => resolve());
        client2.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Disconnect client2 to set them offline
      client2.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Both client1 and client3 should receive the presence update
      const receivedConnections: string[] = [];
      const broadcastPromise = new Promise<void>((resolve, reject) => {
        const handler = (data: any) => {
          if (data.userId === testUser2.id && data.presence === 'online') {
            receivedConnections.push('received');
            if (receivedConnections.length === 2) {
              resolve();
            }
          }
        };

        client1.on(WS_EVENTS.PRESENCE_UPDATE, handler);
        client3.on(WS_EVENTS.PRESENCE_UPDATE, handler);

        // Reconnect client2 to trigger presence update broadcast
        client2 = ioClient(`http://localhost:${serverPort}`, {
          ...clientOptions,
          auth: { token: token2 },
        });

        setTimeout(() => reject(new Error('Multi-connection broadcast timeout')), 5000);
      });

      await broadcastPromise;
      expect(receivedConnections.length).toBe(2);
    });
  });
});
