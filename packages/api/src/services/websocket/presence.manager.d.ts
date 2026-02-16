declare class PresenceManager {
    private readonly PRESENCE_TTL;
    private readonly DM_PARTICIPANTS_CACHE_TTL;
    setOnline(userId: string): Promise<void>;
    setOffline(userId: string): Promise<void>;
    getPresence(userId: string): Promise<'online' | 'offline'>;
    refreshPresence(userId: string): Promise<void>;
    getBulkPresence(userIds: string[]): Promise<Map<string, 'online' | 'offline'>>;
    subscribeToDMPresence(userId: string, dmChannelId: string): Promise<void>;
    unsubscribeFromDMPresence(userId: string, dmChannelId: string): Promise<void>;
    getDMParticipantPresence(dmChannelId: string): Promise<Map<string, 'online' | 'offline'>>;
    private getCachedDMParticipants;
    invalidateDMParticipantsCache(dmChannelId: string): Promise<void>;
    private broadcastPresenceUpdate;
}
export declare const presenceManager: PresenceManager;
export {};
//# sourceMappingURL=presence.manager.d.ts.map