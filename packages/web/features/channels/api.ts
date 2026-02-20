import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-provider';
import type { Channel, Message } from '@/types';

interface MessagesResponse {
  messages: Message[];
  cursor?: string;
  hasMore: boolean;
}

// Transform snake_case API response to camelCase for frontend
function transformMessage(msg: any): Message {
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

// Send a message
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
      // TODO: Implement attachment upload flow
      // 1. Upload attachments via POST /api/v1/attachments
      // 2. Get attachment IDs from response
      // 3. Include attachment IDs in message create request

      if (attachments && attachments.length > 0) {
        console.warn('Attachments are not yet implemented. Message will be sent without attachments.');
      }

      const response = context === 'dm'
        ? await apiClient.createDMMessage(channelId, content)
        : await apiClient.createMessage({ channelId, content });
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
