/**
 * Bitwise Permission Flags
 *
 * Each permission is represented by a bit position.
 * Permissions are stored as bigint to support all flags.
 *
 * Three-state permission model: Allow, Neutral, Deny
 * - Bit set in `allow` only -> Allow
 * - Bit set in `deny` only -> Deny
 * - Bit not set in either -> Neutral
 * - Bit set in both -> Allow wins (for safety)
 *
 * Based on Discord's permission system with hierarchical role-based resolution.
 */

/**
 * Permission bit flags (34 permissions)
 */
export const PERMISSION_FLAGS = {
  // General Server Permissions (5)
  VIEW_CHANNELS: 1n << 0n,           // 1 - View all channels
  MANAGE_CHANNELS: 1n << 1n,         // 2 - Create, edit, delete channels
  MANAGE_ROLES: 1n << 2n,            // 4 - Manage role permissions
  MANAGE_SERVER: 1n << 3n,           // 8 - Manage server settings
  MANAGE_MESSAGES: 1n << 4n,         // 16 - Manage messages server-wide

  // Membership Permissions (6)
  CREATE_INVITE: 1n << 5n,           // 32 - Create invite links
  CHANGE_NICKNAME: 1n << 6n,         // 64 - Change own nickname
  MANAGE_NICKNAMES: 1n << 7n,        // 128 - Change other members' nicknames
  KICK_MEMBERS: 1n << 8n,            // 256 - Kick members from server
  BAN_MEMBERS: 1n << 9n,             // 512 - Ban members from server
  TIMEOUT_MEMBERS: 1n << 10n,        // 1024 - Timeout members

  // Text Channel Permissions (15)
  VIEW_CHANNEL: 1n << 11n,           // 2048 - View specific channel
  SEND_MESSAGES: 1n << 12n,          // 4096 - Send messages
  SEND_TTS_MESSAGES: 1n << 13n,      // 8192 - Send text-to-speech messages
  MANAGE_MESSAGES_TEXT: 1n << 14n,   // 16384 - Manage messages in text channels
  EMBED_LINKS: 1n << 15n,            // 32768 - Embed links in messages
  ATTACH_FILES: 1n << 16n,           // 65536 - Attach files to messages
  READ_MESSAGE_HISTORY: 1n << 17n,   // 131072 - Read message history
  MENTION_EVERYONE: 1n << 18n,       // 262144 - Mention @everyone
  USE_EXTERNAL_EMOJIS: 1n << 19n,    // 524288 - Use external emojis
  ADD_REACTIONS: 1n << 20n,          // 1048576 - Add reactions to messages
  USE_APPLICATION_COMMANDS: 1n << 21n, // 2097152 - Use slash commands
  CREATE_PUBLIC_THREADS: 1n << 22n,  // 4194304 - Create public threads
  CREATE_PRIVATE_THREADS: 1n << 23n, // 8388608 - Create private threads
  SEND_MESSAGES_IN_THREADS: 1n << 24n, // 16777216 - Send messages in threads
  PIN_MESSAGES: 1n << 25n,           // 33554432 - Pin messages

  // Voice Permissions (7)
  CONNECT: 1n << 26n,                // 67108864 - Connect to voice channels
  SPEAK: 1n << 27n,                  // 134217728 - Speak in voice channels
  STREAM: 1n << 28n,                 // 268435456 - Stream video
  MUTE_MEMBERS: 1n << 29n,           // 536870912 - Mute members in voice
  DEAFEN_MEMBERS: 1n << 30n,         // 1073741824 - Deafen members in voice
  MOVE_MEMBERS: 1n << 31n,           // 2147483648 - Move members between voice channels
  USE_VOICE_ACTIVITY: 1n << 32n,     // 4294967296 - Use voice activity detection

  // Advanced Permissions (1)
  ADMINISTRATOR: 1n << 33n,          // 8589934592 - All permissions (bypasses all checks)
} as const;

/**
 * Permission names for display
 */
export const PERMISSION_NAMES: Record<keyof typeof PERMISSION_FLAGS, string> = {
  // General Server Permissions
  VIEW_CHANNELS: 'View Channels',
  MANAGE_CHANNELS: 'Manage Channels',
  MANAGE_ROLES: 'Manage Roles',
  MANAGE_SERVER: 'Manage Server',
  MANAGE_MESSAGES: 'Manage Messages',

  // Membership Permissions
  CREATE_INVITE: 'Create Invite',
  CHANGE_NICKNAME: 'Change Nickname',
  MANAGE_NICKNAMES: 'Manage Nicknames',
  KICK_MEMBERS: 'Kick Members',
  BAN_MEMBERS: 'Ban Members',
  TIMEOUT_MEMBERS: 'Timeout Members',

  // Text Channel Permissions
  VIEW_CHANNEL: 'View Channel',
  SEND_MESSAGES: 'Send Messages',
  SEND_TTS_MESSAGES: 'Send TTS Messages',
  MANAGE_MESSAGES_TEXT: 'Manage Messages',
  EMBED_LINKS: 'Embed Links',
  ATTACH_FILES: 'Attach Files',
  READ_MESSAGE_HISTORY: 'Read Message History',
  MENTION_EVERYONE: 'Mention Everyone',
  USE_EXTERNAL_EMOJIS: 'Use External Emojis',
  ADD_REACTIONS: 'Add Reactions',
  USE_APPLICATION_COMMANDS: 'Use Application Commands',
  CREATE_PUBLIC_THREADS: 'Create Public Threads',
  CREATE_PRIVATE_THREADS: 'Create Private Threads',
  SEND_MESSAGES_IN_THREADS: 'Send Messages in Threads',
  PIN_MESSAGES: 'Pin Messages',

  // Voice Permissions
  CONNECT: 'Connect',
  SPEAK: 'Speak',
  STREAM: 'Video',
  MUTE_MEMBERS: 'Mute Members',
  DEAFEN_MEMBERS: 'Deafen Members',
  MOVE_MEMBERS: 'Move Members',
  USE_VOICE_ACTIVITY: 'Use Voice Activity',

  // Advanced Permissions
  ADMINISTRATOR: 'Administrator',
};

/**
 * Permission categories for UI grouping
 */
export const PERMISSION_CATEGORIES = {
  general: ['VIEW_CHANNELS', 'MANAGE_CHANNELS', 'MANAGE_ROLES', 'MANAGE_SERVER', 'MANAGE_MESSAGES'] as const,
  membership: ['CREATE_INVITE', 'CHANGE_NICKNAME', 'MANAGE_NICKNAMES', 'KICK_MEMBERS', 'BAN_MEMBERS', 'TIMEOUT_MEMBERS'] as const,
  text: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'SEND_TTS_MESSAGES', 'MANAGE_MESSAGES_TEXT', 'EMBED_LINKS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY', 'MENTION_EVERYONE', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'USE_APPLICATION_COMMANDS', 'CREATE_PUBLIC_THREADS', 'CREATE_PRIVATE_THREADS', 'SEND_MESSAGES_IN_THREADS', 'PIN_MESSAGES'] as const,
  voice: ['CONNECT', 'SPEAK', 'STREAM', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS', 'USE_VOICE_ACTIVITY'] as const,
  advanced: ['ADMINISTRATOR'] as const,
} as const;

/**
 * All permissions combined (used for administrator check)
 */
export const ALL_PERMISSIONS = Object.values(PERMISSION_FLAGS).reduce((acc, flag) => acc | flag, 0n);

/**
 * Default permissions for @everyone role
 * Using the new three-state model with allow/deny structure
 */
export const DEFAULT_PERMISSIONS = {
  allow:
    PERMISSION_FLAGS.VIEW_CHANNEL |
    PERMISSION_FLAGS.SEND_MESSAGES |
    PERMISSION_FLAGS.READ_MESSAGE_HISTORY |
    PERMISSION_FLAGS.ADD_REACTIONS |
    PERMISSION_FLAGS.CONNECT |
    PERMISSION_FLAGS.SPEAK |
    PERMISSION_FLAGS.USE_VOICE_ACTIVITY,
  deny: 0n,
};

/**
 * Permission helper functions
 */
export class Permissions {
  /**
   * Check if a permission set has a specific permission
   */
  static has(permissions: bigint, flag: bigint): boolean {
    // Administrator has all permissions
    if (permissions & PERMISSION_FLAGS.ADMINISTRATOR) {
      return true;
    }
    return (permissions & flag) === flag;
  }

  /**
   * Add permissions to a set
   */
  static add(permissions: bigint, ...flags: bigint[]): bigint {
    return flags.reduce((acc, flag) => acc | flag, permissions);
  }

  /**
   * Remove permissions from a set
   */
  static remove(permissions: bigint, ...flags: bigint[]): bigint {
    return flags.reduce((acc, flag) => acc & ~flag, permissions);
  }

  /**
   * Check if has all specified permissions
   */
  static hasAll(permissions: bigint, ...flags: bigint[]): boolean {
    // Administrator has all permissions
    if (permissions & PERMISSION_FLAGS.ADMINISTRATOR) {
      return true;
    }
    return flags.every(flag => (permissions & flag) === flag);
  }

  /**
   * Check if has any of the specified permissions
   */
  static hasAny(permissions: bigint, ...flags: bigint[]): boolean {
    // Administrator has all permissions
    if (permissions & PERMISSION_FLAGS.ADMINISTRATOR) {
      return true;
    }
    return flags.some(flag => (permissions & flag) === flag);
  }

  /**
   * Get list of permission names from a permission set
   */
  static getNames(permissions: bigint): string[] {
    return Object.entries(PERMISSION_FLAGS)
      .filter(([_, flag]) => this.has(permissions, flag))
      .map(([name]) => PERMISSION_NAMES[name as keyof typeof PERMISSION_FLAGS]);
  }

  /**
   * Convert permission bits to array of permission keys
   */
  static toArray(permissions: bigint): string[] {
    return Object.entries(PERMISSION_FLAGS)
      .filter(([_, flag]) => (permissions & flag) === flag)
      .map(([name]) => name);
  }

  /**
   * Convert array of permission keys to bits
   */
  static fromArray(keys: string[]): bigint {
    return keys.reduce((acc, key) => {
      const flag = PERMISSION_FLAGS[key as keyof typeof PERMISSION_FLAGS];
      return flag ? acc | flag : acc;
    }, 0n);
  }
}

/**
 * Three-state permission resolution result
 */
export type PermissionState = 'allow' | 'deny' | 'neutral';

/**
 * Permission overwrite data structure for permission resolution
 * (Different from the database entity PermissionOverwrite in types/index.ts)
 */
export interface PermissionOverwriteData {
  id: string;        // Role ID or member ID
  type: 'role' | 'member';
  allow: bigint;
  deny: bigint;
}

/**
 * Role permission structure with three-state model
 */
export interface RolePermissions {
  allow: bigint;
  deny: bigint;
}

/**
 * Permission breakdown for debugging/UI display
 */
export interface PermissionBreakdown {
  [permission: string]: {
    result: PermissionState;
    source: 'owner' | 'administrator' | `role:${string}` | 'overwrite' | 'default';
  };
}

export type PermissionFlag = keyof typeof PERMISSION_FLAGS;
