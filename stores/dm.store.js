import { create } from "zustand";
export const useDMStore = create((set, get) => ({
    channels: [],
    activeChannelId: null,
    messages: {},
    typingUsers: {},
    unreadCounts: {},
    setChannels: (channels) => set({ channels }),
    addChannel: (channel) => set((state) => ({
        channels: [channel, ...state.channels],
    })),
    updateChannel: (channelId, updates) => set((state) => ({
        channels: state.channels.map((ch) => ch.id === channelId ? { ...ch, ...updates } : ch),
    })),
    removeChannel: (channelId) => set((state) => ({
        channels: state.channels.filter((ch) => ch.id !== channelId),
        messages: Object.fromEntries(Object.entries(state.messages).filter(([id]) => id !== channelId)),
        activeChannelId: state.activeChannelId === channelId ? null : state.activeChannelId,
    })),
    setActiveChannel: (channelId) => {
        set({ activeChannelId: channelId });
        if (channelId) {
            get().clearUnread(channelId);
        }
    },
    setMessages: (channelId, messages) => set((state) => ({
        messages: { ...state.messages, [channelId]: messages },
    })),
    addMessage: (channelId, message) => set((state) => {
        const existing = state.messages[channelId] || [];
        if (existing.some((m) => m.id === message.id)) {
            return state;
        }
        return {
            messages: {
                ...state.messages,
                [channelId]: [...existing, message],
            },
        };
    }),
    updateMessage: (channelId, messageId, updates) => set((state) => {
        const messages = state.messages[channelId];
        if (!messages)
            return state;
        return {
            messages: {
                ...state.messages,
                [channelId]: messages.map((m) => m.id === messageId ? { ...m, ...updates } : m),
            },
        };
    }),
    deleteMessage: (channelId, messageId) => set((state) => {
        const messages = state.messages[channelId];
        if (!messages)
            return state;
        return {
            messages: {
                ...state.messages,
                [channelId]: messages.filter((m) => m.id !== messageId),
            },
        };
    }),
    prependMessages: (channelId, messages) => set((state) => {
        const existing = state.messages[channelId] || [];
        const newMessages = messages.filter((m) => !existing.some((e) => e.id === m.id));
        return {
            messages: {
                ...state.messages,
                [channelId]: [...newMessages, ...existing],
            },
        };
    }),
    setTypingUsers: (channelId, userIds) => set((state) => ({
        typingUsers: { ...state.typingUsers, [channelId]: userIds },
    })),
    addTypingUser: (channelId, userId) => set((state) => {
        const current = state.typingUsers[channelId] || [];
        if (current.includes(userId))
            return state;
        return {
            typingUsers: {
                ...state.typingUsers,
                [channelId]: [...current, userId],
            },
        };
    }),
    removeTypingUser: (channelId, userId) => set((state) => {
        const current = state.typingUsers[channelId] || [];
        return {
            typingUsers: {
                ...state.typingUsers,
                [channelId]: current.filter((id) => id !== userId),
            },
        };
    }),
    incrementUnread: (channelId) => set((state) => {
        if (state.activeChannelId === channelId)
            return state;
        return {
            unreadCounts: {
                ...state.unreadCounts,
                [channelId]: (state.unreadCounts[channelId] || 0) + 1,
            },
        };
    }),
    clearUnread: (channelId) => set((state) => ({
        unreadCounts: { ...state.unreadCounts, [channelId]: 0 },
    })),
}));
//# sourceMappingURL=dm.store.js.map