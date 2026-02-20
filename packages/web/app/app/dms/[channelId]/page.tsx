'use client';

import { AppShell } from '@/components/layout';
import { MessageView } from '@/components/messaging';
import { useParams } from 'next/navigation';
import { useChannelMessages, useSendMessage, useEditMessage, useDeleteMessage, useAddReaction, useRemoveReaction, usePinMessage, useUnpinMessage } from '@/features/channels';
import { useDMChannel } from '@/features/dms';
import { useAuthStore, useUIStore, useVoiceStore } from '@/stores';
import { useMemo, useCallback, useState } from 'react';
import { Avatar } from '@/components/ui';
import { toast } from '@/stores/toast-store';
import { DMCallPanel, DMCallButtons } from '@/components/voice/dm-call-panel';

export default function DMPage() {
  const params = useParams();
  const channelId = params.channelId as string;

  // Get current user ID
  const currentUserId = useAuthStore((s) => s.user?.id);
  const openModal = useUIStore((s) => s.openModal);

  // Fetch DM channel info
  const { data: dmChannel, isLoading: channelLoading } = useDMChannel(channelId);

  // Get recipient info (filter out current user)
  const recipient = useMemo(() => {
    if (!dmChannel?.recipients) return null;
    // Filter out the current user to get the other person
    return dmChannel.recipients.find((r) => r.id !== currentUserId) || dmChannel.recipients[0];
  }, [dmChannel, currentUserId]);

  // Fetch messages with infinite scroll
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChannelMessages(channelId, 'dm');

  // Message mutations
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
      context: 'dm',
    });
    setReplyingTo(null);
  };

  // Handle editing a message
  const handleEdit = useCallback((messageId: string, content: string) => {
    editMessage.mutate({
      messageId,
      content,
      channelId,
      context: 'dm',
    });
  }, [editMessage, channelId]);

  // Handle deleting a message
  const handleDelete = useCallback((messageId: string) => {
    deleteMessage.mutate({
      messageId,
      channelId,
      context: 'dm',
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
        context: 'dm',
      });
    } else {
      // User hasn't reacted, add the reaction
      addReaction.mutate({
        messageId,
        emoji,
        channelId,
        context: 'dm',
      });
    }
  }, [addReaction, removeReaction, channelId, messages]);

  // Handle replying to a message
  const handleReply = useCallback((messageId: string) => {
    setReplyingTo(messageId);
  }, []);

  // Handle pinning a message
  const handlePin = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.pinned) {
      unpinMessage.mutate({
        messageId,
        channelId,
        context: 'dm',
      }, {
        onSuccess: () => toast.success('Message unpinned'),
        onError: () => toast.error('Failed to unpin message'),
      });
    } else {
      pinMessage.mutate({
        messageId,
        channelId,
        context: 'dm',
      }, {
        onSuccess: () => toast.success('Message pinned'),
        onError: () => toast.error('Failed to pin message'),
      });
    }
  }, [pinMessage, unpinMessage, channelId, messages]);

  // Handle clicking on a user to show profile
  const handleUserClick = useCallback((userId: string) => {
    openModal('user-profile', { userId });
  }, [openModal]);

  // Handle joining a call
  const handleJoinCall = useCallback(() => {
    // Could show a toast or notification that call started
  }, []);

  // Loading state
  if (channelLoading) {
    return (
      <AppShell sectionName="Loading...">
        <div className="flex h-full items-center justify-center text-foreground-muted">
          Loading...
        </div>
      </AppShell>
    );
  }

  // Channel not found
  if (!dmChannel) {
    return (
      <AppShell sectionName="DM Not Found">
        <div className="flex h-full items-center justify-center text-foreground-muted">
          Direct message not found
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell sectionName={recipient?.displayName || recipient?.username || 'DM'}>
      <div className="flex h-full flex-col">
        {/* DM header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar
              src={recipient?.avatar}
              alt={recipient?.displayName || recipient?.username || 'User'}
              size="md"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">
                {recipient?.displayName || recipient?.username}
              </span>
            </div>
          </div>
          {/* Call buttons */}
          {recipient && (
            <DMCallButtons
              channelId={channelId}
              recipientId={recipient.id}
              onJoinCall={handleJoinCall}
            />
          )}
        </div>

        {/* Call panel (shown when in a call) */}
        {recipient && (
          <DMCallPanel
            channelId={channelId}
            recipient={recipient}
            onJoinCall={handleJoinCall}
          />
        )}

        {/* Messages */}
        <MessageView
          context="dm"
          channelId={channelId}
          messages={messages}
          onSend={handleSend}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReaction={handleReaction}
          onReply={handleReply}
          onPin={handlePin}
          onUserClick={handleUserClick}
          placeholder={`Message @${recipient?.username || 'user'}`}
          loading={messagesLoading}
          hasMore={hasNextPage}
          isLoadingMore={isFetchingNextPage}
          onLoadMore={fetchNextPage}
        />
      </div>
    </AppShell>
  );
}
