'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronDown, Hash, Bell, Pin } from 'lucide-react';
import type { Message } from '@/stores/messageStore';
import { useMessageStore } from '@/stores/messageStore';
import { useChannelStore } from '@/stores/channelStore';
import { useUIStore } from '@/stores/uiStore';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  channelId: string;
  serverId?: string;
}

function formatDateSeparator(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupMessagesByDate(messages: Message[]): Array<{ type: 'date'; date: string } | { type: 'message'; message: Message; showHeader: boolean }> {
  const groups: Array<{ type: 'date'; date: string } | { type: 'message'; message: Message; showHeader: boolean }> = [];
  let lastDate: string | null = null;
  let lastAuthorId: string | null = null;
  let lastTimestamp: number | null = null;

  for (const message of messages) {
    const messageDate = new Date(message.createdAt).toDateString();

    // Add date separator if date changed
    if (lastDate !== messageDate) {
      groups.push({ type: 'date', date: message.createdAt });
      lastDate = messageDate;
      lastAuthorId = null;
      lastTimestamp = null;
    }

    // Determine if we should show header
    const currentTimestamp = new Date(message.createdAt).getTime();
    const showHeader =
      lastAuthorId !== message.authorId ||
      (lastTimestamp && currentTimestamp - lastTimestamp > 5 * 60 * 1000); // 5 minutes gap

    groups.push({ type: 'message', message, showHeader: showHeader !== false });

    lastAuthorId = message.authorId;
    lastTimestamp = currentTimestamp;
  }

  return groups;
}

export default function MessageList({ channelId }: MessageListProps) {
  const { getMessages, loading, hasMore, fetchMessages, setLoading } = useMessageStore();
  const { getChannel } = useChannelStore();
  const { openModal } = useUIStore();
  const listRef = useRef<HTMLDivElement>(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const messages = getMessages(channelId);
  const channel = getChannel(channelId);
  const groupedContent = groupMessagesByDate(messages);
  const isLoading = loading[channelId];

  // Scroll to bottom on initial load
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [channelId, messages.length]);

  // Handle scroll to show/hide jump button
  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    setShowJumpButton(!isNearBottom);
  }, []);

  // Jump to bottom
  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // Load more messages when scrolling to top
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore[channelId] || messages.length === 0) return;

    setIsLoadingMore(true);
    const scrollHeightBefore = listRef.current?.scrollHeight || 0;

    // Get oldest message ID for pagination
    const oldestMessage = messages[0];
    const before = oldestMessage?.id;

    // Fetch older messages from API
    await fetchMessages(channelId, before);

    // Maintain scroll position after loading
    if (listRef.current) {
      const scrollHeightAfter = listRef.current.scrollHeight;
      listRef.current.scrollTop = scrollHeightAfter - scrollHeightBefore;
    }

    setIsLoadingMore(false);
  }, [channelId, hasMore, isLoadingMore, messages, fetchMessages]);

  // Detect scroll to top
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const handleScrollTop = () => {
      if (list.scrollTop < 50 && hasMore[channelId]) {
        handleLoadMore();
      }
    };

    list.addEventListener('scroll', handleScrollTop);
    return () => list.removeEventListener('scroll', handleScrollTop);
  }, [channelId, hasMore, handleLoadMore]);

  // Show loading state
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-foreground-muted">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 rounded-full bg-background-surface flex items-center justify-center mb-4">
          <Hash className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Welcome to #{channel?.name || 'channel'}!</h2>
        <p className="text-foreground-muted text-center max-w-md">
          This is the start of the #{channel?.name || 'channel'} channel. Send a message to start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Channel info at top */}
      <div className="px-4 py-2 flex items-center gap-2 border-b border-border">
        <Hash className="w-5 h-5 text-foreground-muted" />
        <span className="font-semibold">{channel?.name || 'channel'}</span>
        {channel?.topic && (
          <>
            <div className="w-px h-5 bg-border mx-2" />
            <span className="text-sm text-foreground-muted truncate">{channel.topic}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors" title="Notifications">
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={() => openModal('pinned-messages', { channelId, channelName: channel?.name })}
            className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
            title="Pinned Messages"
          >
            <Pin className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {/* Load more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* New messages indicator */}
        <div className="px-4 py-2 flex items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
            <Hash className="w-8 h-8 text-background" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Welcome to #{channel?.name || 'channel'}!</h3>
            <p className="text-sm text-foreground-muted">
              This is the start of the #{channel?.name || 'channel'} channel.
            </p>
          </div>
        </div>

        {/* Message groups */}
        {groupedContent.map((item, index) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${index}`} className="relative flex items-center px-4 py-4">
                <div className="absolute left-0 right-0 h-px bg-border" />
                <span className="relative bg-background px-2 text-xs text-foreground-muted font-medium">
                  {formatDateSeparator(new Date(item.date))}
                </span>
              </div>
            );
          }

          return (
            <MessageItem
              key={item.message.id}
              message={item.message}
              showHeader={item.showHeader}
              isCompact={!item.showHeader}
            />
          );
        })}
      </div>

      {/* Typing indicator */}
      <TypingIndicator channelId={channelId} />

      {/* Jump to present button */}
      {showJumpButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-background-elevated border border-border rounded-full shadow-lg text-sm font-medium hover:bg-background-surface transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          New Messages
        </button>
      )}
    </div>
  );
}
