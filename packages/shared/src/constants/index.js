export const API_ROUTES = {
    AUTH: {
        LOGIN: '/api/v1/auth/login',
        REGISTER: '/api/v1/auth/register',
        LOGOUT: '/api/v1/auth/logout',
        REFRESH: '/api/v1/auth/refresh',
    },
    USERS: {
        ME: '/api/v1/users/me',
        BY_ID: (id) => `/api/v1/users/${id}`,
    },
    SERVERS: {
        LIST: '/api/v1/servers',
        BY_ID: (id) => `/api/v1/servers/${id}`,
    },
    CHANNELS: {
        BY_SERVER: (serverId) => `/api/v1/servers/${serverId}/channels`,
        BY_ID: (id) => `/api/v1/channels/${id}`,
    },
    MESSAGES: {
        BY_CHANNEL: (channelId) => `/api/v1/channels/${channelId}/messages`,
        BY_ID: (id) => `/api/v1/messages/${id}`,
    },
};
export const WS_EVENTS = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ERROR: 'error',
    MESSAGE_CREATE: 'message:create',
    MESSAGE_UPDATE: 'message:update',
    MESSAGE_DELETE: 'message:delete',
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
    PRESENCE_UPDATE: 'presence:update',
};
export const VALIDATION = {
    USERNAME: {
        MIN_LENGTH: 3,
        MAX_LENGTH: 32,
    },
    PASSWORD: {
        MIN_LENGTH: 8,
        MAX_LENGTH: 128,
    },
    MESSAGE: {
        MAX_LENGTH: 2000,
    },
    SERVER_NAME: {
        MIN_LENGTH: 2,
        MAX_LENGTH: 100,
    },
    CHANNEL_NAME: {
        MIN_LENGTH: 2,
        MAX_LENGTH: 100,
    },
};
//# sourceMappingURL=index.js.map