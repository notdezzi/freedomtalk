/**
 * Shared TypeScript types and interfaces
 */

// ============================================
// User types
// ============================================
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  userId: string;
  displayName?: string;
  bio?: string;
  pronouns?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  customStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Server types
// ============================================
export interface Server {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  iconUrl?: string;
  bannerUrl?: string;
  splashUrl?: string;
  discoverySplashUrl?: string;
  defaultRoleId?: string;
  systemChannelId?: string;
  rulesChannelId?: string;
  publicUpdatesChannelId?: string;
  afkChannelId?: string;
  afkTimeout: number;
  nsfw: boolean;
  verified: boolean;
  vanityUrlCode?: string;
  memberCount: number;
  maxMembers: number;
  preferredLocale: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServerMember {
  id: string;
  serverId: string;
  userId: string;
  nickname?: string;
  avatarUrl?: string;
  mute: boolean;
  deaf: boolean;
  pending: boolean;
  joinedAt: Date;
  boostedSince?: Date;
  communicationDisabledUntil?: string;
  roles?: Role[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ServerBan {
  id: string;
  serverId: string;
  userId: string;
  reason?: string;
  bannedBy: string;
  createdAt: Date;
}

// ============================================
// Role types
// ============================================
export interface Role {
  id: string;
  serverId: string;
  name: string;
  color: number;
  hoist: boolean;
  icon?: string;
  position: number;
  permissions: bigint;
  managed: boolean;
  mentionable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Channel types
// ============================================
export type ChannelType = 'text' | 'voice' | 'announcement' | 'stage' | 'forum';

export interface Channel {
  id: string;
  serverId: string;
  categoryId?: string;
  name: string;
  type: ChannelType;
  topic?: string;
  position: number;
  nsfw: boolean;
  rateLimitPerUser: number;
  parentId?: string;
  lastMessageId?: string;
  bitrate?: number;
  userLimit?: number;
  rtcRegion?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelCategory {
  id: string;
  serverId: string;
  name: string;
  position: number;
  nsfw: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Permission types
// ============================================
export type PermissionOverwriteType = 'role' | 'member';

export interface PermissionOverwrite {
  id: string;
  channelId: string;
  targetId: string;
  targetType: PermissionOverwriteType;
  allow: bigint;
  deny: bigint;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Message types
// ============================================
export interface Message {
  id: string;
  content: string;
  authorId: string;
  channelId?: string;
  dmChannelId?: string;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Invite types
// ============================================
export interface Invite {
  id: string;
  serverId: string;
  channelId: string;
  inviterId: string;
  code: string;
  maxUses?: number;
  uses: number;
  maxAge?: number;
  temporary: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// ============================================
// DM Channel types
// ============================================
export type DMChannelType = 'dm' | 'group_dm';

export interface DMChannel {
  id: string;
  type: DMChannelType;
  name?: string;
  iconUrl?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DMChannelParticipant {
  id: string;
  dmChannelId: string;
  userId: string;
  isActive: boolean;
  joinedAt: Date;
  leftAt?: Date;
}

// ============================================
// Reaction types
// ============================================
export interface Emoji {
  id?: string;
  name: string;
  animated?: boolean;
}

export interface MessageReaction {
  emoji: Emoji;
  count: number;
  me: boolean;
}

// ============================================
// Attachment types
// ============================================
export interface Attachment {
  id: string;
  filename: string;
  description?: string;
  contentType: string;
  size: number;
  url: string;
  proxyUrl: string;
  height?: number;
  width?: number;
  ephemeral: boolean;
  spoiler?: boolean;
}

// ============================================
// Embed types
// ============================================
export type EmbedType = 'rich' | 'image' | 'video' | 'link' | 'article' | 'gifv';

export interface EmbedFooter {
  text: string;
  iconUrl?: string;
  proxyIconUrl?: string;
}

export interface EmbedImage {
  url: string;
  proxyUrl?: string;
  height?: number;
  width?: number;
}

export interface EmbedThumbnail {
  url: string;
  proxyUrl?: string;
  height?: number;
  width?: number;
}

export interface EmbedVideo {
  url: string;
  proxyUrl?: string;
  height?: number;
  width?: number;
}

export interface EmbedProvider {
  name: string;
  url?: string;
}

export interface EmbedAuthor {
  name: string;
  url?: string;
  iconUrl?: string;
  proxyIconUrl?: string;
}

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface Embed {
  type: EmbedType;
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: EmbedFooter;
  image?: EmbedImage;
  thumbnail?: EmbedThumbnail;
  video?: EmbedVideo;
  provider?: EmbedProvider;
  author?: EmbedAuthor;
  fields?: EmbedField[];
}

// ============================================
// Friend/Connection types
// ============================================
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked' | 'declined';

export interface Friendship {
  id: string;
  requesterId: string;
  recipientId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendRequest {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  requestedAt: string;
}

// ============================================
// Voice State types
// ============================================
export interface VoiceState {
  userId: string;
  sessionId: string;
  channelId: string;
  serverId?: string;
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo: boolean;
  selfStream: boolean;
  serverMute: boolean;
  serverDeaf: boolean;
  suppress: boolean;
  requestToSpeakTimestamp?: Date;
}

export interface VoiceSession {
  id: string;
  userId: string;
  channelId: string;
  serverId?: string;
  sessionId: string;
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo: boolean;
  selfStream: boolean;
  joinedAt: Date;
  leftAt?: Date;
}

// ============================================
// Presence/Status types
// ============================================
export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline' | 'invisible';

export type ActivityType = 'playing' | 'streaming' | 'listening' | 'watching' | 'custom' | 'competing';

export interface Activity {
  name: string;
  type: ActivityType;
  url?: string;
  timestamps?: {
    start?: number;
    end?: number;
  };
  applicationId?: string;
  details?: string;
  state?: string;
  emoji?: Emoji;
  party?: {
    id?: string;
    size?: [number, number];
  };
  assets?: {
    largeImage?: string;
    largeText?: string;
    smallImage?: string;
    smallText?: string;
  };
  secrets?: {
    join?: string;
    spectate?: string;
    match?: string;
  };
  instance?: boolean;
  flags?: number;
  buttons?: Array<{ label: string; url: string }>;
}

export interface Presence {
  userId: string;
  status: UserStatus;
  activities: Activity[];
  clientStatus?: {
    desktop?: UserStatus;
    mobile?: UserStatus;
    web?: UserStatus;
  };
}

// ============================================
// API Error types
// ============================================
export enum ApiErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  MFA_REQUIRED = 'MFA_REQUIRED',
  MFA_INVALID = 'MFA_INVALID',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',

  // Channel errors
  CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND',
  INVALID_CHANNEL_TYPE = 'INVALID_CHANNEL_TYPE',

  // Message errors
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  CANNOT_PIN_MESSAGE = 'CANNOT_PIN_MESSAGE',

  // Server errors (domain)
  SERVER_NOT_FOUND = 'SERVER_NOT_FOUND',
  NOT_SERVER_MEMBER = 'NOT_SERVER_MEMBER',
  NOT_SERVER_OWNER = 'NOT_SERVER_OWNER',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Voice errors
  VOICE_CHANNEL_FULL = 'VOICE_CHANNEL_FULL',
  ALREADY_IN_VOICE = 'ALREADY_IN_VOICE',

  // Friend errors
  ALREADY_FRIENDS = 'ALREADY_FRIENDS',
  FRIEND_REQUEST_PENDING = 'FRIEND_REQUEST_PENDING',
  CANNOT_FRIEND_SELF = 'CANNOT_FRIEND_SELF',
  USER_BLOCKED = 'USER_BLOCKED',
}
