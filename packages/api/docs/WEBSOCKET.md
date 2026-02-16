# WebSocket API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Connection](#connection)
3. [Authentication](#authentication)
4. [Event Reference](#event-reference)
5. [Room Management](#room-management)
6. [Presence and Status](#presence-and-status)
7. [Message Broadcasting](#message-broadcasting)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Connection Limits](#connection-limits)
11. [Code Examples](#code-examples)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The FreedomTalk WebSocket API provides real-time, bidirectional communication between clients and the server. Built on Socket.io 4.x, it enables:

- **Real-time messaging**: Instant message delivery to channel subscribers
- **Presence tracking**: Online/offline status and user availability
- **Typing indicators**: Real-time typing feedback
- **Room management**: Channel and server subscriptions
- **Horizontal scaling**: Redis pub/sub for multi-instance deployments

### Features

- JWT-based authentication
- Connection limit enforcement (global and per-user)
- Heartbeat mechanism for connection health
- Message deduplication
- Graceful degradation and error handling
- Health monitoring and metrics

---

## Connection

### WebSocket URL

```
ws://localhost:3001
```

For production:
```
wss://api.freedomtalk.com
```

### Connection Flow

1. **Establish WebSocket connection** with authentication token
2. **Server validates JWT** and loads user data
3. **Connection limits checked** (global and per-user)
4. **Connection validated** (account status, rate limiting)
5. **User added to connection manager**
6. **Heartbeat started** (ping/pong every 25s)
7. **Presence set to online**
8. **Subscriptions synced** from database
9. **`authenticated` event emitted** to client

---

## Authentication

### JWT Token

The WebSocket connection requires a valid JWT access token. The token can be provided in three ways:

1. **Auth object** (recommended):
```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

2. **Authorization header**:
```javascript
const socket = io('ws://localhost:3001', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token'
  }
});
```

3. **Query parameter**:
```javascript
const socket = io('ws://localhost:3001?token=your-jwt-token');
```

### Authentication Events

**`authenticated`** - Emitted when authentication succeeds
```json
{
  "userId": "123456789",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**`authentication_error`** - Emitted when authentication fails
```json
{
  "code": "TOKEN_INVALID",
  "message": "Invalid or expired token"
}
```

---

## Event Reference

### Connection Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Server → Client | Connection established |
| `disconnect` | Server → Client | Connection closed |
| `authenticated` | Server → Client | Authentication successful |
| `authentication_error` | Server → Client | Authentication failed |
| `connection_limit_exceeded` | Server → Client | Connection limit reached |
| `error` | Server → Client | General error |

### Heartbeat Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `ping` | Client → Server | Heartbeat ping |
| `pong` | Server → Client | Heartbeat pong response |

### Message Events

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `message:create` | Client → Server | Create new message | `{ content, channelId }` |
| `message:created` | Server → Client | Message created | `{ id, content, authorId, channelId, createdAt, ... }` |
| `message:update` | Client → Server | Update message | `{ messageId, content }` |
| `message:updated` | Server → Client | Message updated | `{ id, content, isEdited, updatedAt, ... }` |
| `message:delete` | Client → Server | Delete message | `{ messageId }` |
| `message:deleted` | Server → Client | Message deleted | `{ id, channelId }` |

### Room Events

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `room:join` | Client → Server | Join a room | `{ roomType, roomId }` |
| `room:joined` | Server → Client | Room joined successfully | `{ roomType, roomId, roomName }` |
| `room:leave` | Client → Server | Leave a room | `{ roomType, roomId }` |
| `room:left` | Server → Client | Room left successfully | `{ roomType, roomId }` |
| `subscription:sync` | Client → Server | Sync subscriptions | `{}` |

### Presence Events

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `presence:update` | Client → Server | Update presence | `{}` |
| `presence:update` | Server → Client | User presence changed | `{ userId, isOnline }` |
| `status:change` | Client → Server | Change status | `{ status }` |
| `status:change` | Server → Client | User status changed | `{ userId, status }` |

### Typing Events

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `typing:start` | Client → Server | Start typing | `{ channelId }` |
| `typing:start` | Server → Client | User started typing | `{ userId, channelId }` |
| `typing:stop` | Client → Server | Stop typing | `{ channelId }` |
| `typing:stop` | Server → Client | User stopped typing | `{ userId, channelId }` |

---

## Room Management

### Room Types

- **`channel`**: Channel rooms for channel-specific messages
- **`server`**: Server rooms for server-wide announcements
- **`dm`**: Direct message rooms for 1-on-1 conversations

### Joining a Room

```javascript
socket.emit('room:join', {
  roomType: 'channel',
  roomId: '123456789'
});

socket.on('room:joined', (data) => {
  console.log(`Joined room: ${data.roomName}`);
});
```

### Leaving a Room

```javascript
socket.emit('room:leave', {
  roomType: 'channel',
  roomId: '123456789'
});

socket.on('room:left', (data) => {
  console.log(`Left room: ${data.roomName}`);
});
```

### Syncing Subscriptions

On connection, sync all channel subscriptions from the database:

```javascript
socket.emit('subscription:sync');
```

This automatically joins all rooms for channels the user has access to.

---

## Presence and Status

### Online/Offline Presence

Presence is automatically managed:
- **Online**: Set when user connects
- **Offline**: Set when user disconnects or heartbeat fails
- **TTL**: 60 seconds (refreshed on activity)

### User Status Values

| Status | Description |
|--------|-------------|
| `online` | User is active |
| `away` | User is away from keyboard |
| `busy` | User is busy/do not disturb |
| `offline` | User is offline |

### Changing Status

```javascript
socket.emit('status:change', {
  status: 'away'
});

socket.on('status:change', (data) => {
  console.log(`User ${data.userId} is now ${data.status}`);
});
```

### Typing Indicators

**Start typing:**
```javascript
socket.emit('typing:start', {
  channelId: '123456789'
});
```

**Stop typing:**
```javascript
socket.emit('typing:stop', {
  channelId: '123456789'
});
```

**Receive typing events:**
```javascript
socket.on('typing:start', (data) => {
  console.log(`User ${data.userId} is typing in channel ${data.channelId}`);
});

socket.on('typing:stop', (data) => {
  console.log(`User ${data.userId} stopped typing`);
});
```

**Typing indicator features:**
- **Debouncing**: Max 1 event per 3 seconds per user
- **Auto-timeout**: Automatically stops after 5 seconds of inactivity
- **Channel-scoped**: Only visible to users in the same channel

---

## Message Broadcasting

### Creating a Message

```javascript
socket.emit('message:create', {
  content: 'Hello, world!',
  channelId: '123456789'
});

socket.on('message:created', (message) => {
  console.log('Message created:', message);
});
```

### Updating a Message

```javascript
socket.emit('message:update', {
  messageId: '987654321',
  content: 'Updated message content'
});

socket.on('message:updated', (message) => {
  console.log('Message updated:', message);
});
```

### Deleting a Message

```javascript
socket.emit('message:delete', {
  messageId: '987654321'
});

socket.on('message:deleted', (data) => {
  console.log(`Message ${data.id} deleted from channel ${data.channelId}`);
});
```

### Message Format

Messages received via WebSocket use **camelCase** format:

```json
{
  "id": "123456789",
  "content": "Hello, world!",
  "authorId": "987654321",
  "channelId": "111222333",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "isEdited": false,
  "isDeleted": false
}
```

---

## Error Handling

### Error Events

All errors are emitted via the `error` event:

```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `TOKEN_INVALID` | Invalid or malformed JWT token | Re-authenticate |
| `TOKEN_EXPIRED` | JWT token has expired | Refresh token and reconnect |
| `TOKEN_MISSING` | No authentication token provided | Provide token |
| `ACCOUNT_INACTIVE` | User account is inactive/banned | Contact support |
| `VALIDATION_FAILED` | Connection validation failed | Check connection parameters |
| `GLOBAL_LIMIT_EXCEEDED` | Maximum global connections reached | Retry later |
| `USER_LIMIT_EXCEEDED` | Maximum per-user connections reached | Close other connections |
| `RATE_LIMITED` | Too many connection attempts | Wait and retry |
| `PERMISSION_DENIED` | Insufficient permissions | Check user permissions |
| `CHANNEL_NOT_FOUND` | Channel does not exist | Verify channel ID |
| `MESSAGE_NOT_FOUND` | Message does not exist | Verify message ID |

### Error Response Format

```json
{
  "code": "TOKEN_EXPIRED",
  "message": "JWT token has expired",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Rate Limiting

### Connection Rate Limiting

- **IP-based**: Max **10 connections per IP per minute**
- **Enforcement**: Connections exceeding limit are rejected with `RATE_LIMITED` error

### Typing Indicator Rate Limiting

- **Debouncing**: Max **1 typing event per 3 seconds per user**
- **Auto-timeout**: Typing indicator automatically stops after **5 seconds**

### Message Rate Limiting

Message rate limiting is handled at the HTTP API level. WebSocket messages are subject to the same limits.

---

## Connection Limits

### Global Connection Limit

- **Default**: 10,000 concurrent connections
- **Configuration**: `WS_MAX_CONNECTIONS` environment variable
- **Behavior**: New connections are rejected when limit is reached

### Per-User Connection Limit

- **Default**: 5 concurrent connections per user
- **Configuration**: `WS_MAX_CONNECTIONS_PER_USER` environment variable
- **Behavior**: 6th connection attempt is rejected with `USER_LIMIT_EXCEEDED` error

### Connection Limit Exceeded Event

```javascript
socket.on('connection_limit_exceeded', (data) => {
  console.error('Connection limit exceeded:', data);
  // data.code: 'GLOBAL_LIMIT_EXCEEDED' or 'USER_LIMIT_EXCEEDED'
  // data.message: Error message
  // data.limit: Maximum allowed connections
  // data.current: Current connection count
});
```

---

## Code Examples

### Complete Client Example (JavaScript)

```javascript
import { io } from 'socket.io-client';

// Connect with authentication
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('authenticated', (data) => {
  console.log('Authenticated:', data);

  // Sync subscriptions
  socket.emit('subscription:sync');

  // Join a channel
  socket.emit('room:join', {
    roomType: 'channel',
    roomId: '123456789'
  });
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Message events
socket.on('message:created', (message) => {
  console.log('New message:', message);
  // Update UI with new message
});

socket.on('message:updated', (message) => {
  console.log('Message updated:', message);
  // Update message in UI
});

socket.on('message:deleted', (data) => {
  console.log('Message deleted:', data);
  // Remove message from UI
});

// Presence events
socket.on('presence:update', (data) => {
  console.log(`User ${data.userId} is ${data.isOnline ? 'online' : 'offline'}`);
  // Update user presence in UI
});

socket.on('status:change', (data) => {
  console.log(`User ${data.userId} status: ${data.status}`);
  // Update user status in UI
});

// Typing events
socket.on('typing:start', (data) => {
  console.log(`User ${data.userId} is typing in channel ${data.channelId}`);
  // Show typing indicator
});

socket.on('typing:stop', (data) => {
  console.log(`User ${data.userId} stopped typing`);
  // Hide typing indicator
});

// Send a message
function sendMessage(content, channelId) {
  socket.emit('message:create', {
    content,
    channelId
  });
}

// Start typing
function startTyping(channelId) {
  socket.emit('typing:start', { channelId });
}

// Stop typing
function stopTyping(channelId) {
  socket.emit('typing:stop', { channelId });
}

// Change status
function changeStatus(status) {
  socket.emit('status:change', { status });
}
```

### TypeScript Client Example

```typescript
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  authorId: string;
  channelId: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  isDeleted: boolean;
}

interface PresenceUpdate {
  userId: string;
  isOnline: boolean;
}

interface StatusChange {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
}

interface TypingEvent {
  userId: string;
  channelId: string;
}

class WebSocketClient {
  private socket: Socket;

  constructor(token: string) {
    this.socket = io('ws://localhost:3001', {
      auth: { token }
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected');
    });

    this.socket.on('authenticated', () => {
      this.socket.emit('subscription:sync');
    });

    this.socket.on('message:created', (message: Message) => {
      this.handleNewMessage(message);
    });

    this.socket.on('presence:update', (data: PresenceUpdate) => {
      this.handlePresenceUpdate(data);
    });

    this.socket.on('status:change', (data: StatusChange) => {
      this.handleStatusChange(data);
    });

    this.socket.on('typing:start', (data: TypingEvent) => {
      this.handleTypingStart(data);
    });

    this.socket.on('typing:stop', (data: TypingEvent) => {
      this.handleTypingStop(data);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  public sendMessage(content: string, channelId: string): void {
    this.socket.emit('message:create', { content, channelId });
  }

  public joinChannel(channelId: string): void {
    this.socket.emit('room:join', {
      roomType: 'channel',
      roomId: channelId
    });
  }

  public leaveChannel(channelId: string): void {
    this.socket.emit('room:leave', {
      roomType: 'channel',
      roomId: channelId
    });
  }

  public startTyping(channelId: string): void {
    this.socket.emit('typing:start', { channelId });
  }

  public stopTyping(channelId: string): void {
    this.socket.emit('typing:stop', { channelId });
  }

  public changeStatus(status: 'online' | 'away' | 'busy' | 'offline'): void {
    this.socket.emit('status:change', { status });
  }

  public disconnect(): void {
    this.socket.disconnect();
  }

  private handleNewMessage(message: Message): void {
    // Implement message handling
  }

  private handlePresenceUpdate(data: PresenceUpdate): void {
    // Implement presence update handling
  }

  private handleStatusChange(data: StatusChange): void {
    // Implement status change handling
  }

  private handleTypingStart(data: TypingEvent): void {
    // Implement typing start handling
  }

  private handleTypingStop(data: TypingEvent): void {
    // Implement typing stop handling
  }
}

// Usage
const client = new WebSocketClient('your-jwt-token');
client.sendMessage('Hello, world!', '123456789');
```

---

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to WebSocket server

**Solutions**:
- Verify WebSocket URL is correct
- Check that JWT token is valid and not expired
- Ensure CORS origin is whitelisted
- Check network connectivity and firewall rules

---

**Problem**: Connection immediately disconnects

**Solutions**:
- Check authentication token validity
- Verify account status is active (not banned/suspended)
- Check server logs for authentication errors
- Ensure connection limits are not exceeded

---

### Authentication Issues

**Problem**: `TOKEN_INVALID` error

**Solutions**:
- Verify JWT token format is correct
- Check token signature is valid
- Ensure token is provided in correct location (auth.token, headers, or query)

---

**Problem**: `TOKEN_EXPIRED` error

**Solutions**:
- Refresh JWT token using refresh token endpoint
- Reconnect with new token
- Implement automatic token refresh logic

---

### Message Delivery Issues

**Problem**: Messages not being received

**Solutions**:
- Verify user has joined the channel room (`room:join`)
- Check channel subscription status (`subscription:sync`)
- Verify user has permission to access the channel
- Check server logs for routing errors

---

**Problem**: Duplicate messages received

**Solutions**:
- Implement client-side deduplication using message IDs
- Check for multiple active connections
- Verify message broadcaster deduplication is working

---

### Performance Issues

**Problem**: High latency or slow message delivery

**Solutions**:
- Check network latency between client and server
- Verify Redis connection is healthy
- Monitor server CPU and memory usage
- Check WebSocket health endpoint: `GET /api/v1/websocket/health`

---

**Problem**: Connection drops frequently

**Solutions**:
- Check heartbeat mechanism (ping/pong every 25s)
- Verify network stability
- Check server logs for heartbeat failures
- Implement reconnection logic with exponential backoff

---

### Rate Limiting Issues

**Problem**: `RATE_LIMITED` error

**Solutions**:
- Reduce connection attempt frequency
- Implement exponential backoff for reconnection
- Check IP-based rate limit (10 connections per IP per minute)

---

**Problem**: `USER_LIMIT_EXCEEDED` error

**Solutions**:
- Close unused connections (max 5 per user)
- Implement connection management to reuse existing connections
- Check for connection leaks in client code

---

### Debugging Tips

1. **Enable debug logging**:
   ```javascript
   const socket = io('ws://localhost:3001', {
     auth: { token: 'your-token' },
     transports: ['websocket'],
     debug: true
   });
   ```

2. **Monitor connection state**:
   ```javascript
   console.log('Connected:', socket.connected);
   console.log('Socket ID:', socket.id);
   ```

3. **Check health endpoint**:
   ```bash
   curl http://localhost:3001/api/v1/websocket/health
   ```

4. **Review server logs** for detailed error messages and stack traces

5. **Use browser DevTools** Network tab to inspect WebSocket frames

---

## Additional Resources

- **Socket.io Client Documentation**: https://socket.io/docs/v4/client-api/
- **JWT Authentication**: See `/api/v1/auth` endpoints
- **HTTP API Documentation**: See `API.md`
- **Server Health Monitoring**: `GET /api/v1/websocket/health`

---

**Last Updated**: 2024-01-15
**API Version**: v1
**Socket.io Version**: 4.8.1
```


