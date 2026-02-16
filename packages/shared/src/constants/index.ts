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
  
  // Messages
  MESSAGE_CREATE: 'message:create',
  MESSAGE_UPDATE: 'message:update',
  MESSAGE_DELETE: 'message:delete',
  
  // Typing
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  
  // Presence
  PRESENCE_UPDATE: 'presence:update',
} as const;

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
} as const;

