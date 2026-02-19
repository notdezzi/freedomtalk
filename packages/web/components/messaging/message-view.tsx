'use client';

import { useRef, useCallback, type ReactNode } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { cn } from '@/lib/utils';
import { MessageItem, type MessageItemProps } from './message-item';
import { MessageInput } from './message-input';
import { TypingIndicator } from './typing-indicator';
import { SkeletonMessage } from '@/components/ui';
import type { Message, TypingUser } from '@/types';

export interface MessageViewProps {
  context: 'server' | 'dm';
  channelId: string;
  messages: Message[];
  typingUsers?: TypingUser[];
  onSend: (content: string, attachments?: File[]) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  headerComponent?: ReactNode;
  placeholder?: string;
  className?: string;
}

export function MessageView({
  context,
  channelId,
  messages,
  typingUsers = [],
  onSend,
  onEdit,
  onDelete,
  onReaction,
  onReply,
  onPin,
  loading,
  hasMore,
  onLoadMore,
  headerComponent,
  placeholder,
  className,
}: MessageViewProps) {
  const virtuosoRef = useRef(null);

  const handleStartReached = useCallback(() => {
    if (hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, onLoadMore]);

  // Group consecutive messages by the same author
  const groupedMessages = groupMessages(messages);

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
      <div className="flex-1 overflow-hidden">
        <Virtuoso
          ref={virtuosoRef}
          data={groupedMessages}
          startReached={handleStartReached}
          overscan={200}
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
              context={context}
            />
          )}
          className="h-full"
        />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <TypingIndicator users={typingUsers} />
      )}

      {/* Message input */}
      <MessageInput
        channelId={channelId}
        onSend={onSend}
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
