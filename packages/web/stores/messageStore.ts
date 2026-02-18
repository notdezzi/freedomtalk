import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, type MessageResponse } from '@/lib/api-client';

export interface Message {
  id: string;
  channelId: string;
  serverId?: string;
  authorId: string;
  author: MessageAuthor;
  content: string;
  editedAt?: string;
  editedTimestamp?: string;
  mentionEveryone: boolean;
  mentions: MessageMention[];
  mentionRoles: string[];
  attachments: MessageAttachment[];
  embeds: MessageEmbed[];
  reactions: MessageReaction[];
  pinned: boolean;
  type: 'DEFAULT' | 'REPLY' | 'SYSTEM' | 'JOIN' | 'LEAVE';
  referencedMessage?: Message;
  createdAt: string;
}

export interface MessageAuthor {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  discriminator?: string;
  bot?: boolean;
  color?: string;
}

export interface MessageMention {
  id: string;
  username: string;
  avatar?: string;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  description?: string;
  contentType: string;
  size: number;
  url: string;
  proxyUrl: string;
  height?: number;
  width?: number;
  ephemeral: boolean;
  spoiler?: boolean;
}

export interface MessageEmbed {
  type: 'rich' | 'image' | 'video' | 'link' | 'article';
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: string;
  footer?: {
    text: string;
    iconUrl?: string;
  };
  image?: {
    url: string;
    proxyUrl?: string;
    height?: number;
    width?: number;
  };
  thumbnail?: {
    url: string;
    proxyUrl?: string;
    height?: number;
    width?: number;
  };
  video?: {
    url: string;
    height?: number;
    width?: number;
  };
  provider?: {
    name: string;
    url?: string;
  };
  author?: {
    name: string;
    url?: string;
    iconUrl?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface MessageReaction {
  emoji: {
    id?: string;
    name: string;
    animated?: boolean;
  };
  count: number;
  me: boolean;
}

interface TypingUser {
  userId: string;
  username: string;
  startedAt: number;
}

interface MessageState {
  messages: Record<string, Message[]>; // channelId -> messages
  typingUsers: Record<string, TypingUser[]>; // channelId -> typing users
  lastMessageId: Record<string, string>; // channelId -> last message id
  loading: Record<string, boolean>; // channelId -> loading state
  hasMore: Record<string, boolean>; // channelId -> has more messages
  editingMessageId: string | null;
  replyingTo: Message | null;
  error: string | null;

  // Actions
  fetchMessages: (channelId: string, before?: string, isDM?: boolean) => Promise<void>;
  setMessages: (channelId: string, messages: Message[]) => void;
  prependMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (channelId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (channelId: string, messageId: string) => void;
  deleteMessagesBulk: (channelId: string, messageIds: string[]) => void;

  // Reactions
  addReaction: (channelId: string, messageId: string, emoji: { id?: string; name: string }, userId: string) => void;
  removeReaction: (channelId: string, messageId: string, emoji: { id?: string; name: string }, userId: string) => void;

  // Typing
  addTypingUser: (channelId: string, user: TypingUser) => void;
  removeTypingUser: (channelId: string, userId: string) => void;

  // UI state
  setEditingMessage: (messageId: string | null) => void;
  setReplyingTo: (message: Message | null) => void;
  setLoading: (channelId: string, loading: boolean) => void;

  // Helpers
  getMessages: (channelId: string) => Message[];
  clearError: () => void;
}

// Convert API response to local type
// Handles both camelCase (from socket) and snake_case (from REST API)
function mapMessageResponse(response: Record<string, unknown>): Message {
  // Handle both naming conventions
  const channelId = (response.channelId || response.channel_id || '') as string;
  const authorId = (response.authorId || response.author_id || '') as string;
  const editedAt = (response.editedAt || response.edited_at) as string | undefined;
  const isPinned = (response.isPinned ?? response.is_pinned ?? false) as boolean;
  const createdAt = (response.createdAt || response.created_at || new Date().toISOString()) as string;

  // Handle author data
  const authorData = response.author as Record<string, unknown> | undefined;

  return {
    id: response.id as string,
    channelId,
    authorId,
    author: authorData ? {
      id: authorData.id as string,
      username: (authorData.username || 'Unknown User') as string,
      displayName: authorData.displayName as string | undefined,
      avatar: authorData.avatar as string | undefined,
      bot: authorData.bot as boolean | undefined,
    } : {
      id: authorId,
      username: 'Unknown User',
    },
    content: response.content as string,
    editedAt,
    editedTimestamp: editedAt,
    mentionEveryone: false,
    mentions: [],
    mentionRoles: [],
    attachments: (response.attachments as MessageAttachment[]) || [],
    embeds: (response.embeds as MessageEmbed[]) || [],
    reactions: (response.reactions as MessageReaction[]) || [],
    pinned: isPinned,
    type: 'DEFAULT',
    createdAt,
  };
}

export const useMessageStore = create<MessageState>()(
  persist(
    (set, get) => ({
      messages: {},
      typingUsers: {},
      lastMessageId: {},
      loading: {},
      hasMore: {},
      editingMessageId: null,
      replyingTo: null,
      error: null,

      fetchMessages: async (channelId: string, before?: string, isDM?: boolean) => {
        // Skip fetching for temporary channel IDs
        if (channelId.startsWith('temp-')) {
          return;
        }

        set((state) => ({
          loading: { ...state.loading, [channelId]: true },
          error: null
        }));

        // Use appropriate API based on channel type
        const response = isDM
          ? await apiClient.getDMMessages(channelId, { before, limit: 50 })
          : await apiClient.getMessages({
              channelId,
              before,
              limit: 50,
            });

        if (response.success && response.data) {
          // Handle different response structures - cast through unknown for flexibility
          const data = response.data as unknown;
          const messagesArray = Array.isArray(data)
            ? (data as Record<string, unknown>[])
            : ((data as { messages?: Record<string, unknown>[] }).messages || []);

          // Map and reverse messages (API returns newest first, we want oldest first for display)
          const mappedMessages = messagesArray.map(mapMessageResponse).reverse();
          const currentMessages = get().messages[channelId] || [];

          const hasMore = !Array.isArray(data) &&
            (data as { messages?: unknown[]; hasMore?: boolean }).hasMore !== false;

          // For pagination, prepend older messages; for initial load, set directly
          const messages = before ? [...mappedMessages, ...currentMessages] : mappedMessages;

          set({
            messages: {
              ...get().messages,
              [channelId]: messages,
            },
            lastMessageId: {
              ...get().lastMessageId,
              [channelId]: messages[messages.length - 1]?.id || '',
            },
            hasMore: {
              ...get().hasMore,
              [channelId]: hasMore && mappedMessages.length >= 50,
            },
            loading: { ...get().loading, [channelId]: false },
          });
        } else {
          set({
            error: response.error?.message || 'Failed to fetch messages',
            loading: { ...get().loading, [channelId]: false },
          });
        }
      },

      setMessages: (channelId, messages) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: messages,
          },
          lastMessageId: {
            ...state.lastMessageId,
            [channelId]: messages[messages.length - 1]?.id || '',
          },
          hasMore: {
            ...state.hasMore,
            [channelId]: messages.length >= 50,
          },
        }));
      },

      prependMessages: (channelId, newMessages) => {
        set((state) => {
          const existing = state.messages[channelId] || [];
          return {
            messages: {
              ...state.messages,
              [channelId]: [...newMessages, ...existing],
            },
            hasMore: {
              ...state.hasMore,
              [channelId]: newMessages.length >= 50,
            },
          };
        });
      },

      addMessage: (channelId, message) => {
        set((state) => {
          const existing = state.messages[channelId] || [];
          // Check for duplicate
          if (existing.some((m) => m.id === message.id)) {
            return state;
          }
          return {
            messages: {
              ...state.messages,
              [channelId]: [...existing, message],
            },
            lastMessageId: {
              ...state.lastMessageId,
              [channelId]: message.id,
            },
          };
        });
      },

      updateMessage: (channelId, messageId, updates) => {
        set((state) => {
          const messages = state.messages[channelId];
          if (!messages) return state;

          return {
            messages: {
              ...state.messages,
              [channelId]: messages.map((msg) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
            },
          };
        });
      },

      deleteMessage: (channelId, messageId) => {
        set((state) => {
          const messages = state.messages[channelId];
          if (!messages) return state;

          return {
            messages: {
              ...state.messages,
              [channelId]: messages.filter((msg) => msg.id !== messageId),
            },
          };
        });
      },

      deleteMessagesBulk: (channelId, messageIds) => {
        set((state) => {
          const messages = state.messages[channelId];
          if (!messages) return state;

          const idsToDelete = new Set(messageIds);
          return {
            messages: {
              ...state.messages,
              [channelId]: messages.filter((msg) => !idsToDelete.has(msg.id)),
            },
          };
        });
      },

      addReaction: (channelId, messageId, emoji, _userId) => {
        set((state) => {
          const messages = state.messages[channelId];
          if (!messages) return state;

          return {
            messages: {
              ...state.messages,
              [channelId]: messages.map((msg) => {
                if (msg.id !== messageId) return msg;

                const existingReaction = msg.reactions.find(
                  (r) => r.emoji.name === emoji.name && r.emoji.id === emoji.id
                );

                if (existingReaction) {
                  return {
                    ...msg,
                    reactions: msg.reactions.map((r) =>
                      r.emoji.name === emoji.name && r.emoji.id === emoji.id
                        ? { ...r, count: r.count + 1, me: true }
                        : r
                    ),
                  };
                }

                return {
                  ...msg,
                  reactions: [
                    ...msg.reactions,
                    { emoji, count: 1, me: true },
                  ],
                };
              }),
            },
          };
        });
      },

      removeReaction: (channelId, messageId, emoji, _userId) => {
        set((state) => {
          const messages = state.messages[channelId];
          if (!messages) return state;

          return {
            messages: {
              ...state.messages,
              [channelId]: messages.map((msg) => {
                if (msg.id !== messageId) return msg;

                return {
                  ...msg,
                  reactions: msg.reactions
                    .map((r) =>
                      r.emoji.name === emoji.name && r.emoji.id === emoji.id
                        ? { ...r, count: r.count - 1, me: false }
                        : r
                    )
                    .filter((r) => r.count > 0),
                };
              }),
            },
          };
        });
      },

      addTypingUser: (channelId, user) => {
        set((state) => {
          const existing = state.typingUsers[channelId] || [];
          // Remove if already typing (refresh timeout)
          const filtered = existing.filter((u) => u.userId !== user.userId);
          return {
            typingUsers: {
              ...state.typingUsers,
              [channelId]: [...filtered, user],
            },
          };
        });
      },

      removeTypingUser: (channelId, userId) => {
        set((state) => {
          const existing = state.typingUsers[channelId] || [];
          return {
            typingUsers: {
              ...state.typingUsers,
              [channelId]: existing.filter((u) => u.userId !== userId),
            },
          };
        });
      },

      setEditingMessage: (messageId) => set({ editingMessageId: messageId }),

      setReplyingTo: (message) => set({ replyingTo: message }),

      setLoading: (channelId, loading) => {
        set((state) => ({
          loading: {
            ...state.loading,
            [channelId]: loading,
          },
        }));
      },

      getMessages: (channelId) => {
        return get().messages[channelId] || [];
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'freedomtalk-messages',
      partialize: (state) => ({
        // Only persist minimal message data for recent channels
        lastMessageId: state.lastMessageId,
      }),
    }
  )
);
