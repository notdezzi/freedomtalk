export declare const CACHE_KEYS: {
    readonly USER: "user";
    readonly USER_PROFILE: "user:profile";
    readonly DM_CHANNEL: "dm:channel";
    readonly DM_PARTICIPANTS: "dm:participants";
    readonly USER_DMS: "user:dms";
    readonly PRESENCE: "presence";
    readonly NOTIFICATION_PREFS: "notif:prefs";
    readonly EMOJI: "emoji";
    readonly SERVER_MEMBERS: "server:members";
};
export declare const CACHE_TTL: {
    readonly SHORT: 60;
    readonly MEDIUM: 300;
    readonly LONG: 3600;
    readonly VERY_LONG: 86400;
};
export interface CacheOptions {
    ttl?: number;
    prefix?: string;
}
declare class CacheService {
    get<T>(key: string, options?: CacheOptions): Promise<T | null>;
    set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean>;
    delete(key: string, options?: CacheOptions): Promise<boolean>;
    deletePattern(pattern: string): Promise<number>;
    getOrSet<T>(key: string, fetchFn: () => Promise<T | null>, options?: CacheOptions): Promise<T | null>;
    mget<T>(keys: string[], options?: CacheOptions): Promise<Map<string, T | null>>;
    mset<T>(entries: Array<{
        key: string;
        value: T;
    }>, options?: CacheOptions): Promise<boolean>;
    getUser(userId: string): Promise<Record<string, unknown> | null>;
    invalidateUser(userId: string): Promise<void>;
    getDMChannel(channelId: string): Promise<Record<string, unknown> | null>;
    getDMParticipants(channelId: string): Promise<Record<string, unknown>[] | null>;
    invalidateDMChannel(channelId: string): Promise<void>;
    invalidateUserDMs(userId: string): Promise<void>;
    getUserPresence(userId: string): Promise<Record<string, unknown> | null>;
    invalidatePresence(userId: string): Promise<void>;
    healthCheck(): Promise<{
        status: 'ok' | 'error';
        latency?: number;
        message?: string;
    }>;
}
export declare const cacheService: CacheService;
export {};
//# sourceMappingURL=cache.service.d.ts.map