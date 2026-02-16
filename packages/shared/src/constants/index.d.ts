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
    readonly MESSAGE_CREATE: "message:create";
    readonly MESSAGE_UPDATE: "message:update";
    readonly MESSAGE_DELETE: "message:delete";
    readonly TYPING_START: "typing:start";
    readonly TYPING_STOP: "typing:stop";
    readonly PRESENCE_UPDATE: "presence:update";
};
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
};
//# sourceMappingURL=index.d.ts.map