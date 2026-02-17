'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  Reply,
  Edit3,
  Trash2,
  Smile,
  Pin,
  Copy,
  Check,
} from 'lucide-react';
import type { Message } from '@/stores/messageStore';
import { useAuth } from '@/hooks/useAuth';
import { useMessageStore } from '@/stores/messageStore';
import { useUIStore } from '@/stores/uiStore';
import { useSocket } from '@/hooks/useSocket';
import ReactionPicker from './ReactionPicker';
import MessageContent from './MessageContent';
import MessageAttachments from './MessageAttachments';
import MessageEmbed from './MessageEmbed';

interface MessageItemProps {
  message: Message;
  isCompact?: boolean;
  showHeader?: boolean;
  onReply?: () => void;
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessageItem({
  message,
  isCompact = false,
  showHeader = true,
  onReply,
}: MessageItemProps) {
  const { user } = useAuth();
  const { setEditingMessage, setReplyingTo, deleteMessage, addReaction, removeReaction } = useMessageStore();
  const { openContextMenu, closeContextMenu, contextMenu } = useUIStore();
  const { addReaction: socketAddReaction, removeReaction: socketRemoveReaction } = useSocket();
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ x: 0, y: 0 });
  const messageRef = useRef<HTMLDivElement>(null);

  const isOwn = user?.id === message.authorId;
  const showContextMenu = contextMenu?.data?.messageId === message.id;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, 'message', {
      messageId: message.id,
      channelId: message.channelId,
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    closeContextMenu();
  };

  const handleReply = () => {
    setReplyingTo(message);
    onReply?.();
    closeContextMenu();
  };

  const handleEdit = () => {
    setEditingMessage(message.id);
    closeContextMenu();
  };

  const handleDelete = () => {
    deleteMessage(message.channelId, message.id);
    closeContextMenu();
  };

  const handleReactionClick = (reaction: { emoji: { id?: string; name: string }; me: boolean }) => {
    if (reaction.me) {
      removeReaction(message.channelId, message.id, reaction.emoji, user?.id || '');
      socketRemoveReaction(message.channelId, message.id, reaction.emoji.name);
    } else {
      addReaction(message.channelId, message.id, reaction.emoji, user?.id || '');
      socketAddReaction(message.channelId, message.id, reaction.emoji.name);
    }
  };

  const handleOpenReactionPicker = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setReactionPickerPosition({ x: rect.left, y: rect.top - 8 });
    setShowReactionPicker(true);
  };

  const handleSelectReaction = (emoji: string) => {
    addReaction(message.channelId, message.id, { name: emoji }, user?.id || '');
    socketAddReaction(message.channelId, message.id, emoji);
    setShowReactionPicker(false);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showContextMenu && messageRef.current && !messageRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showContextMenu, closeContextMenu]);

  const renderReactions = () => {
    if (message.reactions.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {message.reactions.map((reaction, i) => (
          <button
            key={`${reaction.emoji.id || reaction.emoji.name}-${i}`}
            onClick={() => handleReactionClick(reaction)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-sm border transition-colors ${
              reaction.me
                ? 'border-accent bg-accent-muted'
                : 'border-border hover:border-accent-muted bg-background-surface'
            }`}
          >
            <span>{reaction.emoji.name}</span>
            <span className={reaction.me ? 'text-accent' : 'text-foreground-muted'}>
              {reaction.count}
            </span>
          </button>
        ))}
        <button
          onClick={handleOpenReactionPicker}
          className="flex items-center justify-center w-6 h-6 rounded border border-border hover:border-accent-muted bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const renderHoverActions = () => (
    <div className="absolute right-4 -top-3 flex items-center gap-0.5 bg-background-elevated rounded border border-border shadow-lg">
      <button
        onClick={handleOpenReactionPicker}
        className="p-1.5 hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
        title="Add Reaction"
      >
        <Smile className="w-4 h-4" />
      </button>
      <button
        onClick={handleReply}
        className="p-1.5 hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
        title="Reply"
      >
        <Reply className="w-4 h-4" />
      </button>
      {isOwn && (
        <button
          onClick={handleEdit}
          className="p-1.5 hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
          title="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={() => {}}
        className="p-1.5 hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
        title="More"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
    </div>
  );

  const renderContextMenu = () => {
    if (!showContextMenu) return null;

    return (
      <div
        className="fixed z-50 min-w-[180px] bg-background-elevated rounded-lg border border-border shadow-xl py-1"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <button
          onClick={handleReply}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-background-surface transition-colors"
        >
          <Reply className="w-4 h-4" />
          Reply
        </button>
        <button
          onClick={handleOpenReactionPicker}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-background-surface transition-colors"
        >
          <Smile className="w-4 h-4" />
          Add Reaction
        </button>
        <button
          onClick={() => {}}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-background-surface transition-colors"
        >
          <Pin className="w-4 h-4" />
          Pin Message
        </button>
        <button
          onClick={handleCopy}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-background-surface transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          Copy Text
        </button>
        <div className="my-1 border-t border-border" />
        {isOwn ? (
          <>
            <button
              onClick={handleEdit}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-background-surface transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit Message
            </button>
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-error hover:bg-error/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Message
            </button>
          </>
        ) : (
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-error hover:bg-error/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Message
          </button>
        )}
      </div>
    );
  };

  const renderReactionPicker = () => {
    if (!showReactionPicker) return null;

    return (
      <div
        className="fixed z-50"
        style={{
          left: reactionPickerPosition.x,
          top: reactionPickerPosition.y,
          transform: 'translateY(-100%)'
        }}
      >
        <ReactionPicker
          onSelect={handleSelectReaction}
          onClose={() => setShowReactionPicker(false)}
        />
      </div>
    );
  };

  if (isCompact && !showHeader) {
    return (
      <div
        ref={messageRef}
        className="group relative px-4 py-0.5 hover:bg-background-surface/50 transition-colors"
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex items-start gap-4">
          {/* Timestamp for compact mode */}
          <span className="w-[40px] text-[10px] text-foreground-subtle pt-0.5 text-right shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <MessageContent
              content={message.content}
              mentions={message.mentions}
              mentionRoles={message.mentionRoles}
              mentionEveryone={message.mentionEveryone}
            />
            <MessageAttachments attachments={message.attachments} />
            {message.embeds.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                {message.embeds.map((embed, i) => (
                  <MessageEmbed key={i} embed={embed} />
                ))}
              </div>
            )}
            {renderReactions()}
          </div>
        </div>

        {/* Hover actions */}
        {showActions && renderHoverActions()}

        {/* Context Menu */}
        {renderContextMenu()}

        {/* Reaction Picker */}
        {renderReactionPicker()}
      </div>
    );
  }

  // Full message display with header
  return (
    <div
      ref={messageRef}
      className="group relative px-4 py-1.5 hover:bg-background-surface/50 transition-colors"
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
          style={{ backgroundColor: message.author.color || '#00E5CC' }}
        >
          {message.author.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.author.avatar}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-background">
              {message.author.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2">
            <span
              className="font-medium hover:underline cursor-pointer"
              style={{ color: message.author.color }}
            >
              {message.author.displayName || message.author.username}
            </span>
            <span
              className="text-xs text-foreground-subtle cursor-default"
              title={formatFullTimestamp(message.createdAt)}
            >
              {formatTimestamp(message.createdAt)}
            </span>
            {message.editedAt && (
              <span className="text-xs text-foreground-subtle">(edited)</span>
            )}
          </div>

          {/* Content */}
          <MessageContent
            content={message.content}
            mentions={message.mentions}
            mentionRoles={message.mentionRoles}
            mentionEveryone={message.mentionEveryone}
          />

          {/* Attachments */}
          <MessageAttachments attachments={message.attachments} />

          {/* Embeds */}
          {message.embeds.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {message.embeds.map((embed, i) => (
                <MessageEmbed key={i} embed={embed} />
              ))}
            </div>
          )}

          {/* Reactions */}
          {renderReactions()}
        </div>
      </div>

      {/* Hover actions */}
      {showActions && renderHoverActions()}

      {/* Context Menu */}
      {renderContextMenu()}

      {/* Reaction Picker */}
      {renderReactionPicker()}
    </div>
  );
}
