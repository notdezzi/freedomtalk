declare class SubscriptionManager {
    private readonly SUBSCRIPTION_TTL;
    subscribe(userId: string, channelId: string): Promise<void>;
    unsubscribe(userId: string, channelId: string): Promise<void>;
    getUserSubscriptions(userId: string): Promise<Set<string>>;
    getChannelSubscribers(channelId: string): Promise<Set<string>>;
    syncSubscriptions(userId: string): Promise<void>;
    isSubscribed(userId: string, channelId: string): Promise<boolean>;
}
export declare const subscriptionManager: SubscriptionManager;
export {};
//# sourceMappingURL=subscription.manager.d.ts.map