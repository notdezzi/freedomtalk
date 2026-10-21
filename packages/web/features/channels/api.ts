import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-provider';
import { useAuthStore } from '@/stores';
import { toast } from '@/stores/toast-store';
import type { Channel, Message } from '@/types';

interface MessagesResponse {
  messages: Message[];
  cursor?: string;
  hasMore: boolean;
}

type MessagesCache = InfiniteData<MessagesResponse>;

// Temporary id prefix for optimistic messages (deduped when the socket echo arrives)
const OPTIMISTIC_PREFIX = 'optimistic-';

// Transform snake_case API response to camelCase for frontend
// (exported for reuse by socket cache updaters in hooks/use-socket.ts)
export function transformMessage(msg: any): Message {
  return {
    id: msg.id,
    channelId: msg.channelId || msg.channel_id,
    serverId: msg.serverId || msg.server_id,
    authorId: msg.authorId || msg.author_id,
    author: msg.author ? {
      id: msg.author.id,
      username: msg.author.username,
      displayName: msg.author.displayName || msg.author.display_name,
      avatar: msg.author.avatar,
      bot: msg.author.bot,
    } : { id: msg.authorId || msg.author_id, username: 'Unknown' },
    content: msg.content,
    createdAt: msg.createdAt || msg.created_at,
    editedAt: msg.editedAt || msg.edited_at || msg.editedTimestamp,
    editedTimestamp: msg.editedTimestamp || msg.edited_timestamp,
    mentionEveryone: msg.mentionEveryone || msg.mention_everyone,
    mentions: msg.mentions,
    mentionRoles: msg.mentionRoles || msg.mention_roles,
    attachments: msg.attachments,
    embeds: msg.embeds,
    reactions: msg.reactions,
    pinned: msg.pinned || msg.isPinned || msg.is_pinned,
    type: msg.type,
    referencedMessage: msg.referencedMessage || msg.referenced_message,
  };
}

// Get messages for a channel with infinite scroll
export function useChannelMessages(channelId: string | undefined, context: 'server' | 'dm' = 'server') {
  const queryKey = context === 'dm'
    ? queryKeys.dms.messages(channelId || '')
    : queryKeys.channels.messages(channelId || '');

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!channelId) return { messages: [], hasMore: false };

      const response = context === 'dm'
        ? await apiClient.getDMMessages(channelId, { before: pageParam, limit: 100 })
        : await apiClient.getMessages({ channelId, before: pageParam, limit: 100 });

      if (response.success && response.data) {
        // Handle both array and object responses
        if (Array.isArray(response.data)) {
          const messages = response.data.map(transformMessage);
          return {
            messages,
            cursor: messages.length > 0 ? messages[messages.length - 1]?.id : undefined,
            hasMore: response.data.length >= 100,
          } as MessagesResponse;
        }
        const rawMessages = 'messages' in response.data ? response.data.messages : [];
        const messages = rawMessages.map(transformMessage);
        return {
          messages,
          // API returns nextCursor for pagination, use that as cursor for next page
          cursor: 'nextCursor' in response.data ? response.data.nextCursor :
                  ('cursor' in response.data ? response.data.cursor : undefined),
          hasMore: 'hasMore' in response.data ? response.data.hasMore : false,
        } as MessagesResponse;
      }
      return { messages: [], hasMore: false } as MessagesResponse;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.cursor : undefined),
    enabled: !!channelId,
  });
}

// Send a message (with optimistic insert; the socket echo dedupes by id)
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      content,
      attachments,
      referencedMessageId,
      context,
    }: {
      channelId: string;
      content: string;
      attachments?: File[];
      referencedMessageId?: string;
      context: 'server' | 'dm';
    }) => {
      if (attachments && attachments.length > 0) {
        toast.error('Attachments are not supported yet');
      }

      const response = context === 'dm'
        ? await apiClient.createDMMessage(channelId, content)
        : await apiClient.createMessage({ channelId, content });
      return response.data;
    },
    onMutate: async (variables) => {
      const queryKey = variables.context === 'dm'
        ? queryKeys.dms.messages(variables.channelId)
        : queryKeys.channels.messages(variables.channelId);

      // Cancel in-flight fetches for this key so they don't clobber the optimistic insert
      await queryClient.cancelQueries({ queryKey });

      // Snapshot for rollback
      const previous = queryClient.getQueryData<MessagesCache>(queryKey);

      const user = useAuthStore.getState().user;
      const tempId = `${OPTIMISTIC_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const optimisticMessage: Message = {
        id: tempId,
        channelId: variables.channelId,
        authorId: user?.id ?? '',
        author: {
          id: user?.id ?? '',
          username: user?.username ?? 'You',
          displayName: user?.displayName,
          avatar: user?.avatar,
        },
        content: variables.content,
        createdAt: new Date().toISOString(),
        referencedMessage: variables.referencedMessageId
          ? previous?.pages
              .flatMap((page) => page.messages)
              .find((m) => m.id === variables.referencedMessageId)
          : undefined,
      };

      // Insert optimistically into the last page (only if the channel is open)
      if (previous) {
        queryClient.setQueryData<MessagesCache>(queryKey, (prev) => {
          if (!prev || prev.pages.length === 0) return prev;
          const pages = [...prev.pages];
          const last = pages.length - 1;
          pages[last] = {
            ...pages[last],
            messages: [...pages[last].messages, optimisticMessage],
          };
          return { ...prev, pages };
        });
      }

      return { previous, queryKey, tempId };
    },
    onSuccess: (data, variables, context) => {
      if (!context) return;

      // Replace the optimistic entry with the real message (or drop it when
      // no data came back — the socket echo will fill it in).
      queryClient.setQueryData<MessagesCache>(context.queryKey, (prev) => {
        if (!prev) return prev;
        const realMessage = data && 'id' in (data as any) ? transformMessage(data) : null;
        return {
          ...prev,
          pages: prev.pages.map((page, pageIndex) => {
            const hasTemp = page.messages.some((m) => m.id === context.tempId);
            if (!hasTemp) return page;
            const messages = page.messages.filter((m) => m.id !== context.tempId);
            if (realMessage && pageIndex === prev.pages.length - 1 && !page.messages.some((m) => m.id === realMessage.id)) {
              messages.push(realMessage);
            }
            return { ...page, messages };
          }),
        };
      });
    },
    onError: (_error, _variables, context) => {
      // Roll back to the snapshot
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      console.error('[SendMessage] Failed to send message:', _error);
    },
  });
}

// Edit a message
export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      content,
      context,
      channelId,
    }: {
      messageId: string;
      content: string;
      context: 'server' | 'dm';
      channelId: string;
    }) => {
      const response = await apiClient.updateMessage(messageId, content);
      return response.data;
    },
    onSuccess: (_, variables) => {
      const queryKey = variables.context === 'dm'
        ? queryKeys.dms.messages(variables.channelId)
        : queryKeys.channels.messages(variables.channelId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Delete a message
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      context,
      channelId,
    }: {
      messageId: string;
      context: 'server' | 'dm';
      channelId: string;
    }) => {
      const response = await apiClient.deleteMessage(messageId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      const queryKey = variables.context === 'dm'
        ? queryKeys.dms.messages(variables.channelId)
        : queryKeys.channels.messages(variables.channelId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Add reaction to a message
export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
      channelId,
      context,
    }: {
      messageId: string;
      emoji: string;
      channelId: string;
      context: 'server' | 'dm';
    }) => {
      const response = await apiClient.addReaction(messageId, emoji);
      return response.data;
    },
    onSuccess: (_, variables) => {
      const queryKey = variables.context === 'dm'
        ? queryKeys.dms.messages(variables.channelId)
        : queryKeys.channels.messages(variables.channelId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Remove reaction from a message
export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
      channelId,
      context,
    }: {
      messageId: string;
      emoji: string;
      channelId: string;
      context: 'server' | 'dm';
    }) => {
      const response = await apiClient.removeReaction(messageId, emoji);
      return response.data;
    },
    onSuccess: (_, variables) => {
      const queryKey = variables.context === 'dm'
        ? queryKeys.dms.messages(variables.channelId)
        : queryKeys.channels.messages(variables.channelId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Pin a message
export function usePinMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      channelId,
      context,
    }: {
      messageId: string;
      channelId: string;
      context: 'server' | 'dm';
    }) => {
      const response = await apiClient.pinMessage(messageId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      const queryKey = variables.context === 'dm'
        ? queryKeys.dms.messages(variables.channelId)
        : queryKeys.channels.messages(variables.channelId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Unpin a message
export function useUnpinMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      channelId,
      context,
    }: {
      messageId: string;
      channelId: string;
      context: 'server' | 'dm';
    }) => {
      const response = await apiClient.unpinMessage(messageId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      const queryKey = variables.context === 'dm'
        ? queryKeys.dms.messages(variables.channelId)
        : queryKeys.channels.messages(variables.channelId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Create a channel
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      data,
    }: {
      serverId: string;
      data: { name: string; type: string; categoryId?: string };
    }) => {
      const response = await apiClient.createChannel(serverId, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the base query key to refetch all channel-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.channels(variables.serverId) });
    },
  });
}

// Update a channel
export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      data,
      serverId,
    }: {
      channelId: string;
      serverId: string;
      data: { name?: string; topic?: string; position?: number };
    }) => {
      const response = await apiClient.updateChannel(serverId, channelId, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.channels(variables.serverId) });
    },
  });
}

// Delete a channel
export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      serverId,
    }: {
      channelId: string;
      serverId: string;
    }) => {
      const response = await apiClient.deleteChannel(serverId, channelId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.channels(variables.serverId) });
    },
  });
}
