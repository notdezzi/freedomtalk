declare class TypingManager {
    private readonly TYPING_TTL;
    private readonly DEBOUNCE_INTERVAL;
    private typingTimeouts;
    private lastTypingTime;
    startTyping(userId: string, channelId: string): Promise<void>;
    stopTyping(userId: string, channelId: string): Promise<void>;
    getTypingUsers(channelId: string): Promise<Set<string>>;
    private setupTimeout;
    private broadcastTypingStart;
    private broadcastTypingStop;
}
export declare const typingManager: TypingManager;
export {};
//# sourceMappingURL=typing.manager.d.ts.map