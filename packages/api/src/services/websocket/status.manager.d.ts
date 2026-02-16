export declare enum UserStatus {
    ONLINE = "online",
    AWAY = "away",
    BUSY = "busy",
    OFFLINE = "offline"
}
declare class StatusManager {
    private readonly STATUS_TTL;
    setStatus(userId: string, status: UserStatus): Promise<void>;
    getStatus(userId: string): Promise<UserStatus>;
    getBulkStatus(userIds: string[]): Promise<Map<string, UserStatus>>;
    setOffline(userId: string): Promise<void>;
    private broadcastStatusChange;
}
export declare const statusManager: StatusManager;
export {};
//# sourceMappingURL=status.manager.d.ts.map