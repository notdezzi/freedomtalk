'use client';

import { useState, type ReactNode } from 'react';
import { cn, formatRelativeTime, formatTime, formatDate } from '@/lib/utils';
import { Avatar, Tooltip } from '@/components/ui';
import { ReactionPicker } from './reaction-picker';
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
          'group relative flex gap-4 px-4 py-0.5 hover:bg-gray-800/50',
          message.pinned && 'bg-yellow-500/5'
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Timestamp on hover */}
        <div className="w-[72px] flex-shrink-0 text-right">
          <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100">
            {formatTime(message.createdAt)}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-gray-200 text-sm break-words whitespace-pre-wrap">
            {message.content}
          </p>

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
        'group relative flex gap-4 px-4 py-2 hover:bg-gray-800/50',
        message.pinned && 'bg-yellow-500/5'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {showHeader ? (
        <Avatar
          src={message.author.avatar}
          alt={message.author.displayName || message.author.username}
          size="md"
          className="flex-shrink-0"
        />
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        {showHeader && (
          <div className="flex items-baseline gap-2">
            <button className="font-medium text-white hover:underline">
              {message.author.displayName || message.author.username}
            </button>
            <Tooltip content={formatDate(message.createdAt)}>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(message.createdAt)}
              </span>
            </Tooltip>
            {message.editedAt && (
              <span className="text-xs text-gray-500">(edited)</span>
            )}
            {message.pinned && (
              <Pin className="h-3 w-3 text-yellow-500" />
            )}
          </div>
        )}

        {/* Content */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full rounded bg-gray-700 p-2 text-white text-sm resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleEditSubmit}
                className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => onEdit(message.content)}
                className="px-3 py-1 bg-gray-600 rounded text-sm hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-200 text-sm break-words whitespace-pre-wrap">
            {message.content}
          </p>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((reaction, index) => (
              <ReactionBadge
                key={index}
                reaction={reaction}
                onClick={() => onReaction(reaction.emoji.name)}
              />
            ))}
          </div>
        )}

        {/* Reply reference */}
        {message.referencedMessage && (
          <div className="mt-2 p-2 bg-gray-800 rounded text-sm text-gray-400 border-l-2 border-gray-600">
            <span className="font-medium text-gray-300">
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
    <div className="absolute right-2 -top-3 flex items-center gap-0.5 rounded bg-gray-800 shadow-lg border border-gray-700">
      {actions.map((action, index) => (
        <Tooltip key={index} content={action.label}>
          <button
            onClick={action.onClick}
            className={cn(
              'p-1.5 text-gray-400 hover:text-white transition-colors',
              action.danger && 'hover:text-red-400'
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
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded text-sm',
        'border border-gray-600 hover:border-gray-500',
        reaction.me ? 'bg-blue-500/20 border-blue-500' : 'bg-gray-700'
      )}
    >
      <span>{reaction.emoji.name}</span>
      <span className={cn('text-xs', reaction.me ? 'text-blue-300' : 'text-gray-400')}>
        {reaction.count}
      </span>
    </button>
  );
}
