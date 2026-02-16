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
    };
    readonly CHANNELS: {
        readonly BY_SERVER: (serverId: string) => string;
        readonly BY_ID: (id: string) => string;
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
    readonly CHANNEL_NAME: {
        readonly MIN_LENGTH: 2;
        readonly MAX_LENGTH: 100;
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
};
//# sourceMappingURL=index.d.ts.map