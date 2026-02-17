export declare const API_ROUTES: {
    readonly AUTH: {
        readonly LOGIN: "/api/v1/auth/login";
        readonly REGISTER: "/api/v1/auth/register";
        readonly LOGOUT: "/api/v1/auth/logout";
        readonly REFRESH: "/api/v1/auth/refresh";
    };
    readonly USERS: {
        readonly ME: "/api/v1/users/me";
        readonly BY_ID: (id: string) => string;
    };
    readonly SERVERS: {
        readonly LIST: "/api/v1/servers";
        readonly BY_ID: (id: string) => string;
        readonly MEMBERS: (serverId: string) => string;
        readonly MEMBER: (serverId: string, userId: string) => string;
        readonly BANS: (serverId: string) => string;
        readonly BAN: (serverId: string, userId: string) => string;
        readonly ROLES: (serverId: string) => string;
        readonly ROLE: (serverId: string, roleId: string) => string;
        readonly INVITES: (serverId: string) => string;
    };
    readonly CHANNELS: {
        readonly BY_SERVER: (serverId: string) => string;
        readonly BY_ID: (id: string) => string;
        readonly MESSAGES: (channelId: string) => string;
    };
    readonly MESSAGES: {
        readonly BY_CHANNEL: (channelId: string) => string;
        readonly BY_ID: (id: string) => string;
    };
};
export declare const WS_EVENTS: {
    readonly CONNECT: "connect";
    readonly DISCONNECT: "disconnect";
    readonly ERROR: "error";
    readonly AUTHENTICATED: "authenticated";
    readonly AUTHENTICATION_ERROR: "authentication_error";
    readonly CONNECTION_LIMIT_EXCEEDED: "connection_limit_exceeded";
    readonly PING: "ping";
    readonly PONG: "pong";
    readonly MESSAGE_CREATE: "message:create";
    readonly MESSAGE_UPDATE: "message:update";
    readonly MESSAGE_DELETE: "message:delete";
    readonly MESSAGE_CREATED: "message:created";
    readonly MESSAGE_UPDATED: "message:updated";
    readonly MESSAGE_DELETED: "message:deleted";
    readonly TYPING_START: "typing:start";
    readonly TYPING_STOP: "typing:stop";
    readonly PRESENCE_UPDATE: "presence:update";
    readonly STATUS_CHANGE: "status:change";
    readonly ROOM_JOIN: "room:join";
    readonly ROOM_LEAVE: "room:leave";
    readonly ROOM_JOINED: "room:joined";
    readonly ROOM_LEFT: "room:left";
    readonly SUBSCRIPTION_SYNC: "subscription:sync";
    readonly REACTION_ADD: "reaction:add";
    readonly REACTION_REMOVE: "reaction:remove";
    readonly REACTION_REMOVE_ALL: "reaction:remove_all";
    readonly REACTION_REMOVE_EMOJI: "reaction:remove_emoji";
    readonly DM_CHANNEL_CREATE: "dm_channel:create";
    readonly DM_CHANNEL_UPDATE: "dm_channel:update";
    readonly DM_CHANNEL_DELETE: "dm_channel:delete";
    readonly DM_CHANNEL_RECIPIENT_ADD: "dm_channel:recipient_add";
    readonly DM_CHANNEL_RECIPIENT_REMOVE: "dm_channel:recipient_remove";
    readonly SERVER_CREATE: "server:create";
    readonly SERVER_UPDATE: "server:update";
    readonly SERVER_DELETE: "server:delete";
    readonly SERVER_MEMBER_ADD: "server_member:add";
    readonly SERVER_MEMBER_UPDATE: "server_member:update";
    readonly SERVER_MEMBER_REMOVE: "server_member:remove";
    readonly SERVER_BAN_ADD: "server_ban:add";
    readonly SERVER_BAN_REMOVE: "server_ban:remove";
    readonly SERVER_ROLE_CREATE: "server_role:create";
    readonly SERVER_ROLE_UPDATE: "server_role:update";
    readonly SERVER_ROLE_DELETE: "server_role:delete";
    readonly CHANNEL_CREATE: "channel:create";
    readonly CHANNEL_UPDATE: "channel:update";
    readonly CHANNEL_DELETE: "channel:delete";
    readonly CHANNEL_PINS_UPDATE: "channel_pins:update";
    readonly INVITE_CREATE: "invite:create";
    readonly INVITE_DELETE: "invite:delete";
};
export type WebSocketEvent = typeof WS_EVENTS[keyof typeof WS_EVENTS];
export declare const VALIDATION: {
    readonly USERNAME: {
        readonly MIN_LENGTH: 3;
        readonly MAX_LENGTH: 32;
    };
    readonly PASSWORD: {
        readonly MIN_LENGTH: 8;
        readonly MAX_LENGTH: 128;
    };
    readonly MESSAGE: {
        readonly MAX_LENGTH: 2000;
    };
    readonly SERVER_NAME: {
        readonly MIN_LENGTH: 2;
        readonly MAX_LENGTH: 100;
    };
    readonly SERVER_DESCRIPTION: {
        readonly MAX_LENGTH: 1200;
    };
    readonly CHANNEL_NAME: {
        readonly MIN_LENGTH: 1;
        readonly MAX_LENGTH: 100;
    };
    readonly CHANNEL_TOPIC: {
        readonly MAX_LENGTH: 1024;
    };
    readonly CATEGORY_NAME: {
        readonly MIN_LENGTH: 1;
        readonly MAX_LENGTH: 100;
    };
    readonly ROLE: {
        readonly MIN_NAME_LENGTH: 1;
        readonly MAX_NAME_LENGTH: 100;
        readonly MAX_ROLES_PER_SERVER: 250;
    };
    readonly NICKNAME: {
        readonly MIN_LENGTH: 1;
        readonly MAX_LENGTH: 32;
    };
    readonly INVITE: {
        readonly CODE_LENGTH: 7;
        readonly MAX_CODE_LENGTH: 10;
        readonly MAX_USES: 100;
        readonly MAX_AGE: 604800;
    };
    readonly REACTION: {
        readonly MAX_PER_MESSAGE: 20;
        readonly MAX_EMOJI_NAME_LENGTH: 32;
    };
    readonly EMBED: {
        readonly MAX_PER_MESSAGE: 10;
        readonly MAX_TITLE_LENGTH: 256;
        readonly MAX_DESCRIPTION_LENGTH: 4096;
        readonly MAX_FIELDS: 25;
        readonly MAX_FIELD_NAME_LENGTH: 256;
        readonly MAX_FIELD_VALUE_LENGTH: 1024;
        readonly MAX_FOOTER_LENGTH: 2048;
        readonly MAX_AUTHOR_NAME_LENGTH: 256;
        readonly MAX_TOTAL_CHARACTERS: 6000;
    };
    readonly ATTACHMENT: {
        readonly MAX_PER_MESSAGE: 10;
        readonly MAX_FILE_SIZE: 26214400;
        readonly ALLOWED_IMAGE_TYPES: readonly ["image/png", "image/jpeg", "image/gif", "image/webp"];
        readonly ALLOWED_VIDEO_TYPES: readonly ["video/mp4", "video/webm", "video/quicktime"];
        readonly ALLOWED_AUDIO_TYPES: readonly ["audio/mpeg", "audio/ogg", "audio/wav"];
        readonly ALLOWED_DOCUMENT_TYPES: readonly ["application/pdf", "text/plain", "application/json"];
    };
    readonly DM_CHANNEL: {
        readonly MIN_PARTICIPANTS: 2;
        readonly MAX_PARTICIPANTS: 10;
        readonly MAX_NAME_LENGTH: 100;
    };
    readonly VOICE: {
        readonly MIN_BITRATE: 8000;
        readonly MAX_BITRATE: 384000;
        readonly DEFAULT_BITRATE: 64000;
        readonly MAX_USER_LIMIT: 99;
    };
};
export declare const DEFAULTS: {
    readonly SERVER: {
        readonly MAX_MEMBERS: 100000;
        readonly AFK_TIMEOUT: 300;
        readonly PREFERRED_LOCALE: "en-US";
    };
    readonly CHANNEL: {
        readonly POSITION: 0;
        readonly RATE_LIMIT: 0;
        readonly BITRATE: 64000;
    };
    readonly ROLE: {
        readonly COLOR: 0;
        readonly POSITION: 0;
        readonly PERMISSIONS: 0n;
    };
    readonly INVITE: {
        readonly MAX_AGE: 86400;
        readonly MAX_USES: 0;
    };
};
export declare const SERVER_CATEGORIES: readonly ["gaming", "music", "education", "science_tech", "entertainment", "hobbies", "community", "finance"];
export type ServerCategory = typeof SERVER_CATEGORIES[number];
export declare const SEARCH: {
    readonly MAX_QUERY_LENGTH: 500;
    readonly DEFAULT_LIMIT: 25;
    readonly MAX_LIMIT: 100;
    readonly AUTOCOMPLETE_LIMIT: 10;
};
//# sourceMappingURL=index.d.ts.map