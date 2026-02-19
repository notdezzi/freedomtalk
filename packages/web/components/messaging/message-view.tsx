'use client';

import { useRef, useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { cn } from '@/lib/utils';
import { MessageItem, type MessageItemProps } from './message-item';
import { MessageInput } from './message-input';
import { TypingIndicator } from './typing-indicator';
import { SkeletonMessage } from '@/components/ui';
import { useChannel } from '@/hooks';
import type { Message, TypingUser } from '@/types';
import { ArrowDown, Loader2 } from 'lucide-react';

export interface MessageViewProps {
  context: 'server' | 'dm';
  channelId: string;
  messages: Message[];
  onSend: (content: string, attachments?: File[]) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onUserClick?: (userId: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  headerComponent?: ReactNode;
  placeholder?: string;
  className?: string;
}

export function MessageView({
  context,
  channelId,
  messages,
  onSend,
  onEdit,
  onDelete,
  onReaction,
  onReply,
  onPin,
  onUserClick,
  loading,
  hasMore,
  isLoadingMore,
  onLoadMore,
  headerComponent,
  placeholder,
  className,
}: MessageViewProps) {
  const virtuosoRef = useRef<any>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Join channel room and get typing users
  const { typingUsers, sendTyping, stopTyping } = useChannel({
    channelId,
    channelType: context === 'dm' ? 'dm' : 'channel',
  });

  // Track previous message count to detect new messages
  const prevMessageCountRef = useRef(messages.length);

  // Group consecutive messages by the same author
  const groupedMessages = useMemo(() => groupMessages(messages), [messages]);

  // Track if this is the initial load
  const isInitialMountRef = useRef(true);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (isInitialMountRef.current && groupedMessages.length > 0) {
      isInitialMountRef.current = false;
      // Use setTimeout to ensure Virtuoso has rendered
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: groupedMessages.length - 1,
          behavior: 'auto',
        });
      }, 0);
    }
  }, [groupedMessages.length]);

  // Scroll to bottom when new messages arrive (if already at bottom)
  useMemo(() => {
    if (messages.length > prevMessageCountRef.current && isAtBottom) {
      // New message added and we were at bottom, scroll to bottom
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: groupedMessages.length - 1,
          behavior: 'smooth',
        });
      }, 0);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, isAtBottom, groupedMessages.length]);

  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: groupedMessages.length - 1,
      behavior: 'smooth',
    });
  }, [groupedMessages.length]);

  if (loading && messages.length === 0) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonMessage key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      {headerComponent}

      {/* Messages */}
      <div className="flex-1 overflow-hidden relative">
        <Virtuoso
          ref={virtuosoRef}
          data={groupedMessages}
          startReached={handleStartReached}
          atBottomStateChange={handleAtBottomStateChange}
          followOutput={isAtBottom ? 'smooth' : false}
          overscan={200}
          components={{
            Header: () =>
              isLoadingMore ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
                  <span className="ml-2 text-sm text-foreground-muted">Loading older messages...</span>
                </div>
              ) : null,
          }}
          itemContent={(index, group) => (
            <MessageItem
              message={group.message}
              variant={group.isGrouped ? 'grouped' : 'default'}
              showHeader={!group.isGrouped}
              isEditing={false}
              onEdit={(content) => onEdit?.(group.message.id, content)}
              onDelete={() => onDelete?.(group.message.id)}
              onReaction={(emoji) => onReaction?.(group.message.id, emoji)}
              onReply={() => onReply?.(group.message.id)}
              onPin={() => onPin?.(group.message.id)}
              onUserClick={onUserClick}
              context={context}
            />
          )}
          className="h-full"
        />

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className={cn(
              'absolute bottom-4 left-1/2 -translate-x-1/2',
              'flex items-center gap-2 px-4 py-2',
              'bg-background-surface hover:bg-background-elevated text-foreground text-sm font-medium',
              'rounded-full shadow-lg transition-all duration-200',
              'hover:scale-105'
            )}
          >
            <ArrowDown className="h-4 w-4" />
            <span>New messages</span>
          </button>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <TypingIndicator users={typingUsers} />
      )}

      {/* Message input */}
      <MessageInput
        channelId={channelId}
        onSend={onSend}
        onTypingStart={sendTyping}
        onTypingStop={stopTyping}
        disabled={loading}
        placeholder={placeholder}
      />
    </div>
  );
}

// Helper function to group consecutive messages by the same author
function groupMessages(messages: Message[]): Array<{
  message: Message;
  isGrouped: boolean;
}> {
  if (!messages.length) return [];

  const result: Array<{ message: Message; isGrouped: boolean }> = [];
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = i > 0 ? sorted[i - 1] : null;

    // Check if messages should be grouped (same author, within 5 minutes)
    const isGrouped =
      previous &&
      previous.authorId === current.authorId &&
      !previous.pinned &&
      !current.pinned &&
      new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60 * 1000;

    result.push({ message: current, isGrouped: !!isGrouped });
  }

  return result;
}
