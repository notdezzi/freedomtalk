// User Types
export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  displayName?: string;
  bio?: string;
  pronouns?: string;
  banner?: string;
  customStatus?: string;
  status?: UserStatus;
  isVerified?: boolean;
  has2FA?: boolean;
  createdAt?: string;
}

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline' | 'invisible';

// Server Types
export interface Server {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  banner?: string;
  ownerId: string;
  memberCount?: number;
  onlineCount?: number;
  position?: number;
  unreadCount?: number;
  hasNotification?: boolean;
  muted?: boolean;
  createdAt?: string;
}

export interface ServerMember {
  id: string;
  serverId: string;
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  status?: UserStatus;
  customStatus?: string;
  roles?: Role[];
  joinedAt: string;
  isOwner?: boolean;
  isOnline?: boolean;
}

export interface Role {
  id: string;
  serverId: string;
  name: string;
  color?: number;
  position: number;
  permissions: string;
  hoist?: boolean;
  icon?: string;
  mentionable?: boolean;
}

// Channel Types
export type ChannelType = 'text' | 'voice' | 'announcement' | 'stage' | 'forum';

export interface Channel {
  id: string;
  serverId: string;
  categoryId?: string;
  name: string;
  type: ChannelType;
  topic?: string;
  position: number;
  nsfw?: boolean;
  rateLimitPerUser?: number;
  bitrate?: number;
  userLimit?: number;
  unreadCount?: number;
  hasNotification?: boolean;
  lastMessageId?: string;
}

export interface Category {
  id: string;
  serverId: string;
  name: string;
  position: number;
  isCollapsed?: boolean;
  channels?: Channel[];
}

// Voice channel type alias
export type VoiceChannel = Channel;

// Message Types
export interface Message {
  id: string;
  channelId: string;
  serverId?: string;
  authorId: string;
  author: MessageAuthor;
  content: string;
  editedAt?: string;
  editedTimestamp?: string;
  mentionEveryone?: boolean;
  mentions?: MentionedUser[];
  mentionRoles?: string[];
  attachments?: Attachment[];
  embeds?: Embed[];
  reactions?: MessageReaction[];
  pinned?: boolean;
  type?: MessageType;
  referencedMessage?: Message;
  createdAt: string;
}

export interface MessageAuthor {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  discriminator?: string;
  bot?: boolean;
  color?: number;
}

export interface MentionedUser {
  id: string;
  username: string;
  avatar?: string;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'embed' | 'sticker' | 'system';

// Reaction Types
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

// Attachment Types
export interface Attachment {
  id: string;
  filename: string;
  description?: string;
  contentType: string;
  size: number;
  url: string;
  proxyUrl?: string;
  height?: number;
  width?: number;
  ephemeral?: boolean;
  spoiler?: boolean;
}

// Embed Types
export interface Embed {
  type?: string;
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: { text: string; iconUrl?: string };
  image?: { url: string; height?: number; width?: number };
  thumbnail?: { url: string; height?: number; width?: number };
  video?: { url: string; height?: number; width?: number };
  provider?: { name: string; url?: string };
  author?: { name: string; url?: string; iconUrl?: string };
  fields?: { name: string; value: string; inline?: boolean }[];
}

// DM Types
export type DMChannelType = 'dm' | 'group_dm';

export interface DMChannel {
  id: string;
  type: DMChannelType;
  name?: string;
  icon?: string;
  ownerId: string;
  recipients: DMRecipient[];
  lastMessageId?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  hasNotification?: boolean;
  createdAt?: string;
}

export interface DMRecipient {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  status?: UserStatus;
}

// Friend Types
export type FriendshipStatus = 'none' | 'friends' | 'pending-sent' | 'pending-received' | 'blocked';

export interface Friend {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  customStatus?: string;
  status?: UserStatus;
  friendSince?: string;
}

export interface FriendRequest {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  requestedAt: string;
}

// Voice Types
export interface VoiceUser {
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  channelId: string;
  sessionId: string;
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo: boolean;
  selfStream: boolean;
  suppress?: boolean;
  isSpeaking?: boolean;
  audioStream?: MediaStream;
  videoStream?: MediaStream;
  screenStream?: MediaStream;
}

// Activity Types
export type ActivityType = 'playing' | 'streaming' | 'listening' | 'watching' | 'custom' | 'competing';

export interface Activity {
  name: string;
  type: ActivityType;
  url?: string;
  details?: string;
  state?: string;
}

// Invite Types
export interface Invite {
  code: string;
  serverId: string;
  serverName: string;
  serverIcon?: string;
  channelId: string;
  channelName: string;
  inviterId: string;
  inviterUsername: string;
  inviterAvatar?: string;
  expiresAt?: string;
  uses: number;
  maxUses?: number;
  memberCount?: number;
  onlineCount?: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  cursor?: string;
  hasMore: boolean;
}

// Typing Types
export interface TypingUser {
  userId: string;
  username: string;
  avatar?: string;
  startedAt: number;
}
