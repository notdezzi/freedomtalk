'use client';

import { AppShell } from '@/components/layout';
import { MessageView } from '@/components/messaging';
import { useParams } from 'next/navigation';
import { useChannelMessages, useSendMessage } from '@/features/channels';
import { useDMChannel } from '@/features/dms';
import { useAuthStore } from '@/stores';
import { useMemo } from 'react';
import { Avatar } from '@/components/ui';

export default function DMPage() {
  const params = useParams();
  const channelId = params.channelId as string;

  // Get current user ID
  const currentUserId = useAuthStore((s) => s.user?.id);

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

  // Send message mutation
  const sendMessage = useSendMessage();

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
      context: 'dm',
    });
  };

  // Loading state
  if (channelLoading) {
    return (
      <AppShell sectionName="Loading...">
        <div className="flex h-full items-center justify-center text-gray-400">
          Loading...
        </div>
      </AppShell>
    );
  }

  // Channel not found
  if (!dmChannel) {
    return (
      <AppShell sectionName="DM Not Found">
        <div className="flex h-full items-center justify-center text-gray-400">
          Direct message not found
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell sectionName={recipient?.displayName || recipient?.username || 'DM'}>
      <div className="flex h-full flex-col">
        {/* DM header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar
              src={recipient?.avatar}
              alt={recipient?.displayName || recipient?.username || 'User'}
              size="md"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-white">
                {recipient?.displayName || recipient?.username}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <MessageView
          context="dm"
          channelId={channelId}
          messages={messages}
          onSend={handleSend}
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
