'use client';

import { useState, type ReactNode } from 'react';
import { cn, formatRelativeTime, formatTime, formatDate } from '@/lib/utils';
import { Avatar, Tooltip } from '@/components/ui';
import { ReactionPicker } from './reaction-picker';
import { MarkdownContent } from './markdown-content';
import {
  MoreHorizontal,
  Reply,
  Edit2,
  Trash2,
  Pin,
  Smile,
  Copy,
} from 'lucide-react';
import type { Message, MessageReaction, Emoji } from '@/types';

export interface MessageItemProps {
  message: Message;
  variant: 'default' | 'compact' | 'grouped';
  showHeader: boolean;
  isEditing: boolean;
  onEdit: (content: string) => void;
  onDelete: () => void;
  onReaction: (emoji: string) => void;
  onReply: () => void;
  onPin: () => void;
  onUserClick?: (userId: string) => void;
  context: 'server' | 'dm';
}

export function MessageItem({
  message,
  variant,
  showHeader,
  isEditing,
  onEdit,
  onDelete,
  onReaction,
  onReply,
  onPin,
  onUserClick,
  context,
}: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [editingContent, setEditingContent] = useState(message.content);

  const handleEditSubmit = () => {
    if (editingContent.trim() && editingContent !== message.content) {
      onEdit(editingContent.trim());
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleReactionSelect = (emoji: string) => {
    onReaction(emoji);
    setShowReactionPicker(false);
  };

  if (variant === 'grouped') {
    return (
      <div
        className={cn(
          'group relative flex gap-4 px-4 py-0.5 hover:bg-background-elevated/50',
          message.pinned && 'bg-warning/5'
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Timestamp on hover - same width as avatar (w-8) */}
        <div className="w-8 flex-shrink-0 flex items-center justify-center">
          <span className="text-[10px] text-foreground-subtle opacity-0 group-hover:opacity-100">
            {formatTime(message.createdAt)}
          </span>
        </div>

        {/* Content - same layout as non-grouped messages */}
        <div className="flex-1 min-w-0">
          <div className="text-foreground text-sm break-words pl-0">
            <MarkdownContent content={message.content} />
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map((reaction, index) => (
                <ReactionBadge key={index} reaction={reaction} />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <MessageActions
            onReply={onReply}
            onEdit={() => {}}
            onDelete={onDelete}
            onPin={onPin}
            onCopy={handleCopy}
            onReaction={() => setShowReactionPicker(true)}
            isPinned={message.pinned}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex gap-4 px-4 py-2 hover:bg-background-elevated/50',
        message.pinned && 'bg-warning/5'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {showHeader ? (
        <button
          onClick={() => onUserClick?.(message.author.id)}
          className="flex-shrink-0 cursor-pointer"
        >
          <Avatar
            src={message.author.avatar}
            alt={message.author.displayName || message.author.username}
            size="md"
          />
        </button>
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        {showHeader && (
          <div className="flex items-baseline gap-2">
            <button
              onClick={() => onUserClick?.(message.author.id)}
              className="font-medium hover:underline cursor-pointer"
              style={{ color: message.author.color ? `#${message.author.color.toString(16).padStart(6, '0')}` : undefined }}
            >
              {message.author.displayName || message.author.username}
            </button>
            <Tooltip content={formatDate(message.createdAt)}>
              <span className="text-xs text-foreground-subtle">
                {formatRelativeTime(message.createdAt)}
              </span>
            </Tooltip>
            {message.editedAt && (
              <span className="text-xs text-foreground-subtle">(edited)</span>
            )}
            {message.pinned && (
              <Pin className="h-3 w-3 text-warning" />
            )}
          </div>
        )}

        {/* Content */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full rounded bg-background-surface p-2 text-foreground text-sm resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleEditSubmit}
                className="px-3 py-1 bg-accent rounded text-sm hover:bg-accent-hover"
              >
                Save
              </button>
              <button
                onClick={() => onEdit(message.content)}
                className="px-3 py-1 bg-background-elevated rounded text-sm hover:bg-background-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-foreground text-sm break-words">
            <MarkdownContent content={message.content} />
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((reaction, index) => {
              // Handle both old and new reaction formats
              const emojiName = reaction.emoji?.name || (reaction as any).emoji_unicode || '?';
              return (
                <ReactionBadge
                  key={index}
                  reaction={reaction}
                  onClick={() => onReaction(emojiName)}
                />
              );
            })}
          </div>
        )}

        {/* Reply reference */}
        {message.referencedMessage && (
          <div className="mt-2 p-2 bg-background-elevated rounded text-sm text-foreground-muted border-l-2 border-border">
            <span className="font-medium text-foreground">
              @{message.referencedMessage.author?.username || 'Unknown'}
            </span>
            : {message.referencedMessage.content}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && !isEditing && (
        <MessageActions
          onReply={onReply}
          onEdit={() => onEdit(message.content)}
          onDelete={onDelete}
          onPin={onPin}
          onCopy={handleCopy}
          onReaction={() => setShowReactionPicker(true)}
          isPinned={message.pinned}
        />
      )}

      {/* Reaction picker */}
      {showReactionPicker && (
        <div className="absolute right-12 top-0">
          <ReactionPicker
            onSelect={handleReactionSelect}
            onClose={() => setShowReactionPicker(false)}
          />
        </div>
      )}
    </div>
  );
}

function MessageActions({
  onReply,
  onEdit,
  onDelete,
  onPin,
  onCopy,
  onReaction,
  isPinned,
}: {
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onCopy: () => void;
  onReaction: () => void;
  isPinned?: boolean;
}) {
  const actions = [
    { icon: <Reply className="h-4 w-4" />, label: 'Reply', onClick: onReply },
    { icon: <Edit2 className="h-4 w-4" />, label: 'Edit', onClick: onEdit },
    { icon: <Smile className="h-4 w-4" />, label: 'React', onClick: onReaction },
    { icon: <Pin className="h-4 w-4" />, label: isPinned ? 'Unpin' : 'Pin', onClick: onPin },
    { icon: <Copy className="h-4 w-4" />, label: 'Copy', onClick: onCopy },
    { icon: <Trash2 className="h-4 w-4" />, label: 'Delete', onClick: onDelete, danger: true },
  ];

  return (
    <div className="absolute right-2 -top-3 flex items-center gap-0.5 rounded bg-background-elevated shadow-lg border border-border">
      {actions.map((action, index) => (
        <Tooltip key={index} content={action.label}>
          <button
            onClick={action.onClick}
            className={cn(
              'p-1.5 text-foreground-muted hover:text-foreground transition-colors',
              action.danger && 'hover:text-error'
            )}
          >
            {action.icon}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

function ReactionBadge({
  reaction,
  onClick,
}: {
  reaction: MessageReaction;
  onClick?: () => void;
}) {
  // Safety check for missing emoji data
  const emojiName = reaction.emoji?.name || (reaction as any).emoji_unicode || '?';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded text-sm',
        'border border-border hover:bg-background-surface',
        reaction.me ? 'bg-accent-muted border-accent' : 'bg-background-surface'
      )}
    >
      <span>{emojiName}</span>
      <span className={cn('text-xs', reaction.me ? 'text-accent' : 'text-foreground-muted')}>
        {reaction.count}
      </span>
    </button>
  );
}
