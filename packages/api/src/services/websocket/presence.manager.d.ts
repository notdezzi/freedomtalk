declare class PresenceManager {
    private readonly PRESENCE_TTL;
    setOnline(userId: string): Promise<void>;
    setOffline(userId: string): Promise<void>;
    getPresence(userId: string): Promise<'online' | 'offline'>;
    refreshPresence(userId: string): Promise<void>;
    getBulkPresence(userIds: string[]): Promise<Map<string, 'online' | 'offline'>>;
    private broadcastPresenceUpdate;
}
export declare const presenceManager: PresenceManager;
export {};
//# sourceMappingURL=presence.manager.d.ts.map