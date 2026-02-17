import type { DMChannel, Message } from "@/types";
interface DMState {
    channels: DMChannel[];
    activeChannelId: string | null;
    messages: Record<string, Message[]>;
    typingUsers: Record<string, string[]>;
    unreadCounts: Record<string, number>;
    setChannels: (channels: DMChannel[]) => void;
    addChannel: (channel: DMChannel) => void;
    updateChannel: (channelId: string, updates: Partial<DMChannel>) => void;
    removeChannel: (channelId: string) => void;
    setActiveChannel: (channelId: string | null) => void;
    setMessages: (channelId: string, messages: Message[]) => void;
    addMessage: (channelId: string, message: Message) => void;
    updateMessage: (channelId: string, messageId: string, updates: Partial<Message>) => void;
    deleteMessage: (channelId: string, messageId: string) => void;
    prependMessages: (channelId: string, messages: Message[]) => void;
    setTypingUsers: (channelId: string, userIds: string[]) => void;
    addTypingUser: (channelId: string, userId: string) => void;
    removeTypingUser: (channelId: string, userId: string) => void;
    incrementUnread: (channelId: string) => void;
    clearUnread: (channelId: string) => void;
}
export declare const useDMStore: import("zustand").UseBoundStore<import("zustand").StoreApi<DMState>>;
export {};
//# sourceMappingURL=dm.store.d.ts.map