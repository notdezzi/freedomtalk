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
