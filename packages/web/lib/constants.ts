// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

// UI Constants
export const HEADER_HEIGHT = 56; // h-14 = 3.5rem = 56px
export const USER_PANEL_HEIGHT = 52;
export const SERVER_ICON_SIZE = 48;
export const AVATAR_SIZES = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 80,
} as const;

// Message Constants
export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGES_PER_PAGE = 50;
export const TYPING_TIMEOUT = 10000; // 10 seconds

// File Upload Constants
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_ATTACHMENTS = 10;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

// WebSocket Events
export const SOCKET_EVENTS = {
  // Connection
  AUTHENTICATED: 'AUTHENTICATED',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  DISCONNECT: 'disconnect',
  CONNECT: 'connect',

  // Rooms
  ROOM_JOIN: 'ROOM_JOIN',
  ROOM_LEAVE: 'ROOM_LEAVE',
  ROOM_JOINED: 'ROOM_JOINED',
  ROOM_LEFT: 'ROOM_LEFT',

  // Messages
  MESSAGE_CREATE: 'MESSAGE_CREATE',
  MESSAGE_CREATED: 'MESSAGE_CREATED',
  MESSAGE_UPDATE: 'MESSAGE_UPDATE',
  MESSAGE_UPDATED: 'MESSAGE_UPDATED',
  MESSAGE_DELETE: 'MESSAGE_DELETE',
  MESSAGE_DELETED: 'MESSAGE_DELETED',

  // Reactions
  REACTION_ADD: 'REACTION_ADD',
  REACTION_REMOVE: 'REACTION_REMOVE',
  REACTION_ADDED: 'reaction:added',
  REACTION_REMOVED: 'reaction:removed',

  // Typing
  TYPING_START: 'TYPING_START',
  TYPING_STOP: 'TYPING_STOP',

  // Presence
  STATUS_CHANGE: 'STATUS_CHANGE',
  PRESENCE_UPDATE: 'PRESENCE_UPDATE',

  // Server
  SERVER_CREATE: 'SERVER_CREATE',
  SERVER_CREATED: 'SERVER_CREATED',
  SERVER_UPDATE: 'SERVER_UPDATE',
  SERVER_UPDATED: 'SERVER_UPDATED',
  SERVER_DELETE: 'SERVER_DELETE',
  SERVER_DELETED: 'SERVER_DELETED',

  // Channel
  CHANNEL_CREATE: 'CHANNEL_CREATE',
  CHANNEL_CREATED: 'CHANNEL_CREATED',
  CHANNEL_UPDATE: 'CHANNEL_UPDATE',
  CHANNEL_UPDATED: 'CHANNEL_UPDATED',
  CHANNEL_DELETE: 'CHANNEL_DELETE',
  CHANNEL_DELETED: 'CHANNEL_DELETED',

  // Friends
  FRIEND_REQUEST_RECEIVED: 'FRIEND_REQUEST_RECEIVED',
  FRIEND_REQUEST_ACCEPTED: 'FRIEND_REQUEST_ACCEPTED',
  FRIEND_REQUEST_REJECTED: 'FRIEND_REQUEST_REJECTED',
  FRIEND_REQUEST_CANCELLED: 'FRIEND_REQUEST_CANCELLED',
  FRIEND_REMOVED: 'FRIEND_REMOVED',
  USER_BLOCKED: 'USER_BLOCKED',
  USER_UNBLOCKED: 'USER_UNBLOCKED',

  // Voice
  VOICE_JOIN: 'VOICE_JOIN',
  VOICE_LEAVE: 'VOICE_LEAVE',
  VOICE_STATE_UPDATE: 'VOICE_STATE_UPDATE',
  VOICE_USER_JOINED: 'VOICE_USER_JOINED',
  VOICE_USER_LEFT: 'VOICE_USER_LEFT',
  VOICE_USER_UPDATED: 'VOICE_USER_UPDATED',
  VOICE_USER_SPEAKING: 'VOICE_USER_SPEAKING',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'freedomtalk_access_token',
  REFRESH_TOKEN: 'freedomtalk_refresh_token',
  THEME: 'freedomtalk_theme',
  SIDEBAR_STATE: 'freedomtalk_sidebar_state',
} as const;

// Status Options
export const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: 'bg-green-500' },
  { value: 'idle', label: 'Idle', color: 'bg-yellow-500' },
  { value: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500' },
  { value: 'invisible', label: 'Invisible', color: 'bg-gray-500' },
] as const;

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = [
  { key: 'k', ctrl: true, description: 'Open search' },
  { key: 'Escape', description: 'Close modal' },
  { key: 'ArrowUp', alt: true, description: 'Previous channel' },
  { key: 'ArrowDown', alt: true, description: 'Next channel' },
  { key: 'm', ctrl: true, description: 'Toggle mute' },
  { key: 'd', ctrl: true, description: 'Toggle deafen' },
] as const;
