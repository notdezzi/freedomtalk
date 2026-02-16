export type NotificationLevel = 'all' | 'mentions' | 'none';
export interface DMNotificationSettings {
    id: string;
    user_id: string;
    dm_channel_id: string;
    is_muted: boolean;
    mute_until: Date | null;
    notification_level: NotificationLevel;
    created_at: Date;
    updated_at: Date;
}
export interface UpdateNotificationSettingsRequest {
    isMuted?: boolean;
    muteUntil?: Date | null;
    notificationLevel?: NotificationLevel;
}
declare class DMNotificationService {
    private readonly CACHE_TTL;
    getSettings(userId: string, dmChannelId: string): Promise<DMNotificationSettings>;
    updateSettings(userId: string, dmChannelId: string, updates: UpdateNotificationSettingsRequest): Promise<DMNotificationSettings>;
    shouldNotify(userId: string, dmChannelId: string, isMention?: boolean): Promise<boolean>;
    muteDM(userId: string, dmChannelId: string, duration?: number): Promise<void>;
    unmuteDM(userId: string, dmChannelId: string): Promise<void>;
    private getCachedSettings;
    private cacheSettings;
    private invalidateCache;
}
export declare const dmNotificationService: DMNotificationService;
export {};
//# sourceMappingURL=dm-notification.service.d.ts.map