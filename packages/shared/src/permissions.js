export const PERMISSION_FLAGS = {
    CREATE_INSTANT_INVITE: 1n << 0n,
    KICK_MEMBERS: 1n << 1n,
    BAN_MEMBERS: 1n << 2n,
    ADMINISTRATOR: 1n << 3n,
    MANAGE_CHANNELS: 1n << 4n,
    MANAGE_SERVER: 1n << 5n,
    ADD_REACTIONS: 1n << 6n,
    VIEW_AUDIT_LOG: 1n << 7n,
    PRIORITY_SPEAKER: 1n << 8n,
    STREAM: 1n << 9n,
    VIEW_CHANNEL: 1n << 10n,
    SEND_MESSAGES: 1n << 11n,
    SEND_TTS_MESSAGES: 1n << 12n,
    MANAGE_MESSAGES: 1n << 13n,
    EMBED_LINKS: 1n << 14n,
    ATTACH_FILES: 1n << 15n,
    READ_MESSAGE_HISTORY: 1n << 16n,
    MENTION_EVERYONE: 1n << 17n,
    USE_EXTERNAL_EMOJIS: 1n << 18n,
    VIEW_SERVER_INSIGHTS: 1n << 19n,
    CONNECT: 1n << 20n,
    SPEAK: 1n << 21n,
    MUTE_MEMBERS: 1n << 22n,
    DEAFEN_MEMBERS: 1n << 23n,
    MOVE_MEMBERS: 1n << 24n,
    USE_VAD: 1n << 25n,
    CHANGE_NICKNAME: 1n << 26n,
    MANAGE_NICKNAMES: 1n << 27n,
    MANAGE_ROLES: 1n << 28n,
    MANAGE_WEBHOOKS: 1n << 29n,
    MANAGE_EMOJIS_AND_STICKERS: 1n << 30n,
    USE_APPLICATION_COMMANDS: 1n << 31n,
    REQUEST_TO_SPEAK: 1n << 32n,
    MANAGE_EVENTS: 1n << 33n,
    MANAGE_THREADS: 1n << 34n,
    CREATE_PUBLIC_THREADS: 1n << 35n,
    CREATE_PRIVATE_THREADS: 1n << 36n,
    USE_EXTERNAL_STICKERS: 1n << 37n,
    SEND_MESSAGES_IN_THREADS: 1n << 38n,
    USE_EMBEDDED_ACTIVITIES: 1n << 39n,
    MODERATE_MEMBERS: 1n << 40n,
};
export const PERMISSION_NAMES = {
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
export const ALL_PERMISSIONS = Object.values(PERMISSION_FLAGS).reduce((acc, flag) => acc | flag, 0n);
export const DEFAULT_PERMISSIONS = PERMISSION_FLAGS.CREATE_INSTANT_INVITE |
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
export class Permissions {
    static has(permissions, flag) {
        if (permissions & PERMISSION_FLAGS.ADMINISTRATOR) {
            return true;
        }
        return (permissions & flag) === flag;
    }
    static add(permissions, ...flags) {
        return flags.reduce((acc, flag) => acc | flag, permissions);
    }
    static remove(permissions, ...flags) {
        return flags.reduce((acc, flag) => acc & ~flag, permissions);
    }
    static hasAll(permissions, ...flags) {
        if (permissions & PERMISSION_FLAGS.ADMINISTRATOR) {
            return true;
        }
        return flags.every(flag => (permissions & flag) === flag);
    }
    static hasAny(permissions, ...flags) {
        if (permissions & PERMISSION_FLAGS.ADMINISTRATOR) {
            return true;
        }
        return flags.some(flag => (permissions & flag) === flag);
    }
    static getNames(permissions) {
        return Object.entries(PERMISSION_FLAGS)
            .filter(([_, flag]) => this.has(permissions, flag))
            .map(([name]) => PERMISSION_NAMES[name]);
    }
    static toArray(permissions) {
        return Object.entries(PERMISSION_FLAGS)
            .filter(([_, flag]) => (permissions & flag) === flag)
            .map(([name]) => name);
    }
    static fromArray(keys) {
        return keys.reduce((acc, key) => {
            const flag = PERMISSION_FLAGS[key];
            return flag ? acc | flag : acc;
        }, 0n);
    }
}
//# sourceMappingURL=permissions.js.map