/**
 * Bitwise Permission Flags
 *
 * Each permission is represented by a bit position.
 * Permissions are stored as bigint to support all flags.
 *
 * Based on Discord's permission system.
 */

/**
 * Permission bit flags
 */
export const PERMISSION_FLAGS = {
  // General permissions
  CREATE_INSTANT_INVITE: 1n << 0n,    // 1 - Create invite links
  KICK_MEMBERS: 1n << 1n,              // 2 - Kick members
  BAN_MEMBERS: 1n << 2n,               // 4 - Ban members
  ADMINISTRATOR: 1n << 3n,             // 8 - All permissions (bypasses all checks)
  MANAGE_CHANNELS: 1n << 4n,           // 16 - Manage channels
  MANAGE_SERVER: 1n << 5n,             // 32 - Manage server
  ADD_REACTIONS: 1n << 6n,             // 64 - Add reactions to messages
  VIEW_AUDIT_LOG: 1n << 7n,            // 128 - View audit logs
  PRIORITY_SPEAKER: 1n << 8n,          // 256 - Priority speaker in voice
  STREAM: 1n << 9n,                    // 512 - Stream video
  VIEW_CHANNEL: 1n << 10n,             // 1024 - View channel
  SEND_MESSAGES: 1n << 11n,            // 2048 - Send messages
  SEND_TTS_MESSAGES: 1n << 12n,        // 4096 - Send text-to-speech messages
  MANAGE_MESSAGES: 1n << 13n,          // 8192 - Manage messages (delete others)
  EMBED_LINKS: 1n << 14n,              // 16384 - Embed links
  ATTACH_FILES: 1n << 15n,             // 32768 - Attach files
  READ_MESSAGE_HISTORY: 1n << 16n,     // 65536 - Read message history
  MENTION_EVERYONE: 1n << 17n,         // 131072 - Mention @everyone
  USE_EXTERNAL_EMOJIS: 1n << 18n,      // 262144 - Use external emojis
  VIEW_SERVER_INSIGHTS: 1n << 19n,     // 524288 - View server insights

  // Voice permissions
  CONNECT: 1n << 20n,                  // 1048576 - Connect to voice channels
  SPEAK: 1n << 21n,                    // 2097152 - Speak in voice channels
  MUTE_MEMBERS: 1n << 22n,             // 4194304 - Mute members
  DEAFEN_MEMBERS: 1n << 23n,           // 8388608 - Deafen members
  MOVE_MEMBERS: 1n << 24n,             // 16777216 - Move members between voice channels
  USE_VAD: 1n << 25n,                  // 33554432 - Use voice activity detection

  // Additional permissions
  CHANGE_NICKNAME: 1n << 26n,          // 67108864 - Change own nickname
  MANAGE_NICKNAMES: 1n << 27n,         // 134217728 - Manage nicknames
  MANAGE_ROLES: 1n << 28n,             // 268435456 - Manage roles
  MANAGE_WEBHOOKS: 1n << 29n,          // 536870912 - Manage webhooks
  MANAGE_EMOJIS_AND_STICKERS: 1n << 30n, // 1073741824 - Manage emojis and stickers
  USE_APPLICATION_COMMANDS: 1n << 31n, // 2147483648 - Use slash commands
  REQUEST_TO_SPEAK: 1n << 32n,         // 4294967296 - Request to speak (stage)
  MANAGE_EVENTS: 1n << 33n,            // 8589934592 - Manage events
  MANAGE_THREADS: 1n << 34n,           // 17179869184 - Manage threads
  CREATE_PUBLIC_THREADS: 1n << 35n,    // 34359738368 - Create public threads
  CREATE_PRIVATE_THREADS: 1n << 36n,   // 68719476736 - Create private threads
  USE_EXTERNAL_STICKERS: 1n << 37n,    // 137438953472 - Use external stickers
  SEND_MESSAGES_IN_THREADS: 1n << 38n, // 274877906944 - Send messages in threads
  USE_EMBEDDED_ACTIVITIES: 1n << 39n,  // 549755813888 - Use embedded activities
  MODERATE_MEMBERS: 1n << 40n,         // 1099511627776 - Timeout members
} as const;

/**
 * Permission names for display
 */
export const PERMISSION_NAMES: Record<keyof typeof PERMISSION_FLAGS, string> = {
  CREATE_INSTANT_INVITE: 'Create Invite',
  KICK_MEMBERS: 'Kick Members',
  BAN_MEMBERS: 'Ban Members',
  ADMINISTRATOR: 'Administrator',
  MANAGE_CHANNELS: 'Manage Channels',
  MANAGE_SERVER: 'Manage Server',
  ADD_REACTIONS: 'Add Reactions',
  VIEW_AUDIT_LOG: 'View Audit Log',
  PRIORITY_SPEAKER: 'Priority Speaker',
  STREAM: 'Video',
  VIEW_CHANNEL: 'View Channel',
  SEND_MESSAGES: 'Send Messages',
  SEND_TTS_MESSAGES: 'Send TTS Messages',
  MANAGE_MESSAGES: 'Manage Messages',
  EMBED_LINKS: 'Embed Links',
  ATTACH_FILES: 'Attach Files',
  READ_MESSAGE_HISTORY: 'Read Message History',
  MENTION_EVERYONE: 'Mention Everyone',
  USE_EXTERNAL_EMOJIS: 'Use External Emojis',
  VIEW_SERVER_INSIGHTS: 'View Server Insights',
  CONNECT: 'Connect',
  SPEAK: 'Speak',
  MUTE_MEMBERS: 'Mute Members',
  DEAFEN_MEMBERS: 'Deafen Members',
  MOVE_MEMBERS: 'Move Members',
  USE_VAD: 'Use Voice Activity',
  CHANGE_NICKNAME: 'Change Nickname',
  MANAGE_NICKNAMES: 'Manage Nicknames',
  MANAGE_ROLES: 'Manage Roles',
  MANAGE_WEBHOOKS: 'Manage Webhooks',
  MANAGE_EMOJIS_AND_STICKERS: 'Manage Emojis & Stickers',
  USE_APPLICATION_COMMANDS: 'Use Application Commands',
  REQUEST_TO_SPEAK: 'Request to Speak',
  MANAGE_EVENTS: 'Manage Events',
  MANAGE_THREADS: 'Manage Threads',
  CREATE_PUBLIC_THREADS: 'Create Public Threads',
  CREATE_PRIVATE_THREADS: 'Create Private Threads',
  USE_EXTERNAL_STICKERS: 'Use External Stickers',
  SEND_MESSAGES_IN_THREADS: 'Send Messages in Threads',
  USE_EMBEDDED_ACTIVITIES: 'Use Embedded Activities',
  MODERATE_MEMBERS: 'Moderate Members',
};

/**
 * All permissions combined (used for administrator check)
 */
export const ALL_PERMISSIONS = Object.values(PERMISSION_FLAGS).reduce((acc, flag) => acc | flag, 0n);

/**
 * Default permissions for @everyone role
 */
export const DEFAULT_PERMISSIONS =
  PERMISSION_FLAGS.CREATE_INSTANT_INVITE |
  PERMISSION_FLAGS.ADD_REACTIONS |
  PERMISSION_FLAGS.STREAM |
  PERMISSION_FLAGS.VIEW_CHANNEL |
  PERMISSION_FLAGS.SEND_MESSAGES |
  PERMISSION_FLAGS.SEND_TTS_MESSAGES |
  PERMISSION_FLAGS.EMBED_LINKS |
  PERMISSION_FLAGS.ATTACH_FILES |
  PERMISSION_FLAGS.READ_MESSAGE_HISTORY |
  PERMISSION_FLAGS.MENTION_EVERYONE |
  PERMISSION_FLAGS.USE_EXTERNAL_EMOJIS |
  PERMISSION_FLAGS.CONNECT |
  PERMISSION_FLAGS.SPEAK |
  PERMISSION_FLAGS.USE_VAD |
  PERMISSION_FLAGS.CHANGE_NICKNAME;

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

export type PermissionFlag = keyof typeof PERMISSION_FLAGS;
