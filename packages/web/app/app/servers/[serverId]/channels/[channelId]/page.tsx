'use client';

import { AppShell } from '@/components/layout';
import { MessageView } from '@/components/messaging';
import { VoiceGridView } from '@/components/voice';
import { useParams, useRouter } from 'next/navigation';
import { useChannelMessages, useSendMessage, useEditMessage, useDeleteMessage, useAddReaction, useRemoveReaction, usePinMessage, useUnpinMessage } from '@/features/channels';
import { useServers, useServerChannels } from '@/features/servers';
import { useAuthStore, useUIStore, useVoiceStore } from '@/stores';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { toast } from '@/stores/toast-store';
import { useSocket } from '@/hooks/use-socket';

export default function ChannelPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.serverId as string;
  const channelId = params.channelId as string;

  // Get current user
  const currentUser = useAuthStore((s) => s.user);
  const openModal = useUIStore((s) => s.openModal);

  // Socket for realtime updates
  const { joinServerRoom, leaveServerRoom, joinRoom, leaveRoom } = useSocket();

  // Track if we're redirecting
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Join server room for realtime member updates
  useEffect(() => {
    if (serverId && serverId !== 'first') {
      joinServerRoom(serverId);
    }
    return () => {
      // Don't leave on unmount - let the next page handle it
    };
  }, [serverId, joinServerRoom]);

  // Join channel room for realtime message updates
  useEffect(() => {
    if (channelId && channelId !== 'first') {
      joinRoom(channelId, 'channel');
    }
    return () => {
      if (channelId && channelId !== 'first') {
        leaveRoom(channelId, 'channel');
      }
    };
  }, [channelId, joinRoom, leaveRoom]);

  // Fetch server and channel data
  const { data: servers = [] } = useServers();
  const { data: channels = [] } = useServerChannels(serverId);

  // Get current server from the list
  const server = useMemo(() => {
    return servers.find((s) => s.id === serverId);
  }, [servers, serverId]);

  // Get current channel
  const currentChannel = useMemo(() => {
    return channels.find((c) => c.id === channelId);
  }, [channels, channelId]);

  // Handle "first" channel redirect in useEffect to avoid setState during render
  useEffect(() => {
    if (channelId === 'first' && channels.length > 0) {
      const firstTextChannel = channels.find((c) => c.type === 'text');
      if (firstTextChannel) {
        setIsRedirecting(true);
        router.replace(`/app/servers/${serverId}/channels/${firstTextChannel.id}`);
      }
    }
  }, [channelId, channels, router, serverId]);

  // Fetch messages with infinite scroll
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChannelMessages(channelId === 'first' ? undefined : channelId, 'server');

  // Send message mutation
  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();
  const pinMessage = usePinMessage();
  const unpinMessage = useUnpinMessage();

  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Flatten messages from infinite query
  const messages = useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page) => page.messages);
  }, [messagesData]);

  // Handle sending a message
  const handleSend = (content: string, attachments?: File[]) => {
    sendMessage.mutate({
      channelId,
      content,
      attachments,
      referencedMessageId: replyingTo || undefined,
      context: 'server',
    });
    setReplyingTo(null);
  };

  // Handle editing a message
  const handleEdit = useCallback((messageId: string, content: string) => {
    editMessage.mutate({
      messageId,
      content,
      channelId,
      context: 'server',
    });
  }, [editMessage, channelId]);

  // Handle deleting a message
  const handleDelete = useCallback((messageId: string) => {
    deleteMessage.mutate({
      messageId,
      channelId,
      context: 'server',
    });
  }, [deleteMessage, channelId]);

  // Handle toggling a reaction (add or remove)
  const handleReaction = useCallback((messageId: string, emoji: string) => {
    // Find the message and check if user has already reacted
    const message = messages.find(m => m.id === messageId);
    const existingReaction = message?.reactions?.find(
      (r: any) => r.emoji?.name === emoji || r.emoji_unicode === emoji
    );

    if (existingReaction?.me) {
      // User has already reacted, remove the reaction
      removeReaction.mutate({
        messageId,
        emoji,
        channelId,
        context: 'server',
      });
    } else {
      // User hasn't reacted, add the reaction
      addReaction.mutate({
        messageId,
        emoji,
        channelId,
        context: 'server',
      });
    }
  }, [addReaction, removeReaction, channelId, messages]);

  // Handle replying to a message
  const handleReply = useCallback((messageId: string) => {
    setReplyingTo(messageId);
  }, []);

  // Handle pinning a message
  const handlePin = useCallback((messageId: string) => {
    // Find the message to check if it's already pinned
    const message = messages.find(m => m.id === messageId);
    if (message?.pinned) {
      unpinMessage.mutate({
        messageId,
        channelId,
        context: 'server',
      }, {
        onSuccess: () => toast.success('Message unpinned'),
        onError: () => toast.error('Failed to unpin message'),
      });
    } else {
      pinMessage.mutate({
        messageId,
        channelId,
        context: 'server',
      }, {
        onSuccess: () => toast.success('Message pinned'),
        onError: () => toast.error('Failed to pin message'),
      });
    }
  }, [pinMessage, unpinMessage, channelId, messages]);

  // Handle clicking on a user to show profile
  const handleUserClick = useCallback((userId: string) => {
    openModal('user-profile', { userId, serverId });
  }, [openModal, serverId]);

  // Voice store - check if connected to voice
  const isConnectedToVoice = useVoiceStore((s) => s.isConnected);
  const voiceChannelId = useVoiceStore((s) => s.currentChannelId);

  // Show loading while redirecting
  if (isRedirecting || channelId === 'first') {
    return (
      <AppShell sectionName="Loading..." serverId={serverId}>
        <div className="flex h-full items-center justify-center text-foreground-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  // Channel not found
  if (!currentChannel) {
    return (
      <AppShell sectionName="Channel Not Found" serverId={serverId}>
        <div className="flex h-full items-center justify-center text-foreground-muted">
          Channel not found
        </div>
      </AppShell>
    );
  }

  // If connected to voice, show voice view instead of messages
  if (isConnectedToVoice && voiceChannelId) {
    return (
      <AppShell sectionName={server?.name || 'Loading...'} serverId={serverId}>
        <VoiceGridView
          channelId={voiceChannelId}
          channelName={channels.find(c => c.id === voiceChannelId)?.name}
        />
      </AppShell>
    );
  }

  return (
    <AppShell sectionName={server?.name || 'Loading...'} serverId={serverId}>
      <div className="flex h-full flex-col">
        {/* Channel header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-foreground-muted">#</span>
            <span className="font-semibold text-foreground">{currentChannel?.name}</span>
            {currentChannel?.topic && (
              <>
                <span className="text-foreground-subtle">|</span>
                <span className="text-sm text-foreground-muted truncate max-w-md">
                  {currentChannel.topic}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Messages - MembersColumn is in AppShell, don't add it here */}
        <MessageView
          context="server"
          channelId={channelId}
          messages={messages}
          onSend={handleSend}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReaction={handleReaction}
          onReply={handleReply}
          onPin={handlePin}
          onUserClick={handleUserClick}
          loading={messagesLoading}
          hasMore={hasNextPage}
          isLoadingMore={isFetchingNextPage}
          onLoadMore={fetchNextPage}
        />
      </div>
    </AppShell>
  );
}
