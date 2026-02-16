/**
 * Shared constants across the application
 */

// API Routes
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
  },
  USERS: {
    ME: '/api/v1/users/me',
    BY_ID: (id: string) => `/api/v1/users/${id}`,
  },
  SERVERS: {
    LIST: '/api/v1/servers',
    BY_ID: (id: string) => `/api/v1/servers/${id}`,
  },
  CHANNELS: {
    BY_SERVER: (serverId: string) => `/api/v1/servers/${serverId}/channels`,
    BY_ID: (id: string) => `/api/v1/channels/${id}`,
  },
  MESSAGES: {
    BY_CHANNEL: (channelId: string) => `/api/v1/channels/${channelId}/messages`,
    BY_ID: (id: string) => `/api/v1/messages/${id}`,
  },
} as const;

// WebSocket Events
export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  AUTHENTICATED: 'authenticated',
  AUTHENTICATION_ERROR: 'authentication_error',
  CONNECTION_LIMIT_EXCEEDED: 'connection_limit_exceeded',

  // Heartbeat
  PING: 'ping',
  PONG: 'pong',

  // Messages
  MESSAGE_CREATE: 'message:create',
  MESSAGE_UPDATE: 'message:update',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_CREATED: 'message:created',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETED: 'message:deleted',

  // Typing
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Presence
  PRESENCE_UPDATE: 'presence:update',
  STATUS_CHANGE: 'status:change',

  // Room Management
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_JOINED: 'room:joined',
  ROOM_LEFT: 'room:left',
  SUBSCRIPTION_SYNC: 'subscription:sync',

  // Reactions
  REACTION_ADD: 'reaction:add',
  REACTION_REMOVE: 'reaction:remove',
  REACTION_REMOVE_ALL: 'reaction:remove_all',
  REACTION_REMOVE_EMOJI: 'reaction:remove_emoji',

  // DM Channels
  DM_CHANNEL_CREATE: 'dm_channel:create',
  DM_CHANNEL_UPDATE: 'dm_channel:update',
  DM_CHANNEL_DELETE: 'dm_channel:delete',
  DM_CHANNEL_RECIPIENT_ADD: 'dm_channel:recipient_add',
  DM_CHANNEL_RECIPIENT_REMOVE: 'dm_channel:recipient_remove',
} as const;

/**
 * WebSocket event type union
 * Represents all possible WebSocket event names
 */
export type WebSocketEvent = typeof WS_EVENTS[keyof typeof WS_EVENTS];

// Validation Constants
export const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 32,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
  },
  MESSAGE: {
    MAX_LENGTH: 2000,
  },
  SERVER_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  CHANNEL_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  REACTION: {
    MAX_PER_MESSAGE: 20,
    MAX_EMOJI_NAME_LENGTH: 32,
  },
  EMBED: {
    MAX_PER_MESSAGE: 10,
    MAX_TITLE_LENGTH: 256,
    MAX_DESCRIPTION_LENGTH: 4096,
    MAX_FIELDS: 25,
    MAX_FIELD_NAME_LENGTH: 256,
    MAX_FIELD_VALUE_LENGTH: 1024,
    MAX_FOOTER_LENGTH: 2048,
    MAX_AUTHOR_NAME_LENGTH: 256,
    MAX_TOTAL_CHARACTERS: 6000,
  },
  ATTACHMENT: {
    MAX_PER_MESSAGE: 10,
    MAX_FILE_SIZE: 26214400, // 25 MB in bytes
    ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const,
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime'] as const,
    ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/ogg', 'audio/wav'] as const,
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'application/json'] as const,
  },
  DM_CHANNEL: {
    MIN_PARTICIPANTS: 2,
    MAX_PARTICIPANTS: 10,
    MAX_NAME_LENGTH: 100,
  },
} as const;

