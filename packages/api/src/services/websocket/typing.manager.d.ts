export type ChannelType = 'channel' | 'dm';
declare class TypingManager {
    private readonly TYPING_TTL;
    private readonly DEBOUNCE_INTERVAL;
    private typingTimeouts;
    private lastTypingTime;
    startTyping(userId: string, channelId: string, channelType?: ChannelType): Promise<void>;
    stopTyping(userId: string, channelId: string, channelType?: ChannelType): Promise<void>;
    getTypingUsers(channelId: string, channelType?: ChannelType): Promise<Set<string>>;
    private setupTimeout;
    private broadcastTypingStart;
    private broadcastTypingStop;
}
export declare const typingManager: TypingManager;
export {};
//# sourceMappingURL=typing.manager.d.ts.map