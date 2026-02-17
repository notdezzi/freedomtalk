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
    MEMBERS: (serverId: string) => `/api/v1/servers/${serverId}/members`,
    MEMBER: (serverId: string, userId: string) => `/api/v1/servers/${serverId}/members/${userId}`,
    BANS: (serverId: string) => `/api/v1/servers/${serverId}/bans`,
    BAN: (serverId: string, userId: string) => `/api/v1/servers/${serverId}/bans/${userId}`,
    ROLES: (serverId: string) => `/api/v1/servers/${serverId}/roles`,
    ROLE: (serverId: string, roleId: string) => `/api/v1/servers/${serverId}/roles/${roleId}`,
    INVITES: (serverId: string) => `/api/v1/servers/${serverId}/invites`,
  },
  CHANNELS: {
    BY_SERVER: (serverId: string) => `/api/v1/servers/${serverId}/channels`,
    BY_ID: (id: string) => `/api/v1/channels/${id}`,
    MESSAGES: (channelId: string) => `/api/v1/channels/${channelId}/messages`,
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

  // Server Events
  SERVER_CREATE: 'server:create',
  SERVER_UPDATE: 'server:update',
  SERVER_DELETE: 'server:delete',
  SERVER_MEMBER_ADD: 'server_member:add',
  SERVER_MEMBER_UPDATE: 'server_member:update',
  SERVER_MEMBER_REMOVE: 'server_member:remove',
  SERVER_BAN_ADD: 'server_ban:add',
  SERVER_BAN_REMOVE: 'server_ban:remove',
  SERVER_ROLE_CREATE: 'server_role:create',
  SERVER_ROLE_UPDATE: 'server_role:update',
  SERVER_ROLE_DELETE: 'server_role:delete',

  // Channel Events
  CHANNEL_CREATE: 'channel:create',
  CHANNEL_UPDATE: 'channel:update',
  CHANNEL_DELETE: 'channel:delete',
  CHANNEL_PINS_UPDATE: 'channel_pins:update',

  // Invite Events
  INVITE_CREATE: 'invite:create',
  INVITE_DELETE: 'invite:delete',
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
  SERVER_DESCRIPTION: {
    MAX_LENGTH: 1200,
  },
  CHANNEL_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  CHANNEL_TOPIC: {
    MAX_LENGTH: 1024,
  },
  CATEGORY_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  ROLE: {
    MIN_NAME_LENGTH: 1,
    MAX_NAME_LENGTH: 100,
    MAX_ROLES_PER_SERVER: 250,
  },
  NICKNAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 32,
  },
  INVITE: {
    CODE_LENGTH: 7,
    MAX_CODE_LENGTH: 10,
    MAX_USES: 100,
    MAX_AGE: 604800, // 7 days in seconds
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
  VOICE: {
    MIN_BITRATE: 8000,
    MAX_BITRATE: 384000,
    DEFAULT_BITRATE: 64000,
    MAX_USER_LIMIT: 99,
  },
} as const;

// Default Values
export const DEFAULTS = {
  SERVER: {
    MAX_MEMBERS: 100000,
    AFK_TIMEOUT: 300, // 5 minutes
    PREFERRED_LOCALE: 'en-US',
  },
  CHANNEL: {
    POSITION: 0,
    RATE_LIMIT: 0,
    BITRATE: 64000,
  },
  ROLE: {
    COLOR: 0,
    POSITION: 0,
    PERMISSIONS: 0n,
  },
  INVITE: {
    MAX_AGE: 86400, // 24 hours
    MAX_USES: 0, // Unlimited
  },
} as const;

// Server Discovery Categories
export const SERVER_CATEGORIES = [
  'gaming',
  'music',
  'education',
  'science_tech',
  'entertainment',
  'hobbies',
  'community',
  'finance',
] as const;

export type ServerCategory = typeof SERVER_CATEGORIES[number];

// Search Constants
export const SEARCH = {
  MAX_QUERY_LENGTH: 500,
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
  AUTOCOMPLETE_LIMIT: 10,
} as const;
