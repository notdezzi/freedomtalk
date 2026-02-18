'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  Gift,
  Sticker,
  Smile,
  Send,
  X,
  Image as ImageIcon,
  FileText,
  Loader2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link2,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Heading1,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { useMessageStore } from '@/stores/messageStore';
import { useChannelStore } from '@/stores/channelStore';
import { useMemberStore } from '@/stores/memberStore';
import { useServerStore } from '@/stores/serverStore';
import StickerPicker from './StickerPicker';

interface MessageInputProps {
  channelId: string;
  serverId?: string;
  isDM?: boolean;
}

const EMOJI_CATEGORIES = [
  ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂'],
  ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖'],
  ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '👋', '🤙', '💪'],
  ['🎉', '🎊', '✨', '🌟', '💥', '💫', '🎁', '🏆', '🎮', '🚀'],
  ['👀', '🔥', '💯', '⚡', '💡', '📌', '🎯', '✅', '❌', '⚠️'],
];

export default function MessageInput({ channelId, serverId, isDM = false }: MessageInputProps) {
  const { user } = useAuth();
  const { isConnected, sendMessage, sendTyping, stopTyping } = useSocket();
  const { editingMessageId, setEditingMessage, replyingTo, setReplyingTo, messages } =
    useMessageStore();
  const { channels } = useChannelStore();
  const { members } = useMemberStore();
  const { currentServerId } = useServerStore();

  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [slowmodeRemaining, setSlowmodeRemaining] = useState(0);
  const [showFormatting, setShowFormatting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const channel = channels[channelId];
  const isEditing = editingMessageId !== null;
  const editingMessage = messages[channelId]?.find((m) => m.id === editingMessageId);

  // Get server members for mentions
  const activeServerId = serverId || currentServerId;
  const serverMembers = activeServerId ? (members[activeServerId] || []) : [];
  const filteredMembers = serverMembers
    .filter((m) =>
      mentionFilter
        ? m.username.toLowerCase().includes(mentionFilter.toLowerCase()) ||
          (m.displayName?.toLowerCase().includes(mentionFilter.toLowerCase()))
        : true
    )
    .slice(0, 8);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  // Focus textarea when editing or replying
  useEffect(() => {
    if ((isEditing || replyingTo) && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing, replyingTo]);

  // Load editing content
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
    }
  }, [editingMessage]);

  // Slowmode timer
  useEffect(() => {
    if (slowmodeRemaining > 0) {
      const timer = setTimeout(() => setSlowmodeRemaining(slowmodeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [slowmodeRemaining]);

  // Send typing indicator when content changes
  useEffect(() => {
    if (content.trim() && isConnected) {
      sendTyping(channelId);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Auto-stop typing after 3 seconds of no changes
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(channelId);
      }, 3000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [content, channelId, isConnected, sendTyping, stopTyping]);

  // Handle mention detection
  useEffect(() => {
    const lastAtIndex = content.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === content.length - 1) {
      setShowMentions(true);
      setMentionFilter('');
    } else if (lastAtIndex !== -1) {
      const afterAt = content.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ') && afterAt.length <= 20) {
        setShowMentions(true);
        setMentionFilter(afterAt);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, [content]);

  const handleSubmit = useCallback(async () => {
    if ((!content.trim() && attachments.length === 0) || !user) return;
    if (slowmodeRemaining > 0) return;

    setIsSubmitting(true);

    // Stop typing indicator
    stopTyping(channelId);

    try {
      if (isEditing && editingMessage) {
        // Update existing message via socket
        sendMessage(channelId, content.trim(), editingMessage.referencedMessage?.id, isDM);
        const { updateMessage } = useMessageStore.getState();
        updateMessage(channelId, editingMessage.id, {
          content: content.trim(),
          editedAt: new Date().toISOString(),
        });
        setEditingMessage(null);
      } else {
        // Send message via socket - the server will broadcast it back
        // Don't add optimistically to avoid duplicates
        sendMessage(channelId, content.trim(), replyingTo?.id, isDM);

        // Set slowmode if channel has it
        if (channel?.rateLimitPerUser && channel.rateLimitPerUser > 0) {
          setSlowmodeRemaining(channel.rateLimitPerUser);
        }
      }

      setContent('');
      setAttachments([]);
      setReplyingTo(null);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [content, attachments, user, slowmodeRemaining, isEditing, editingMessage, channelId, channel, setEditingMessage, setReplyingTo, replyingTo, sendMessage, stopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      if (isEditing) {
        setEditingMessage(null);
        setContent('');
      }
      if (replyingTo) {
        setReplyingTo(null);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const addEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleStickerSelect = (sticker: { id: string; name: string; url: string }) => {
    // Send sticker as a special message format
    if (user) {
      sendMessage(channelId, `:sticker:${sticker.id}:${sticker.name}`, undefined, isDM);
    }
    setShowStickerPicker(false);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setContent('');
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const charCount = content.length;
  const maxChars = 2000;
  const isOverLimit = charCount > maxChars;
  const canSend = (content.trim() || attachments.length > 0) && !isOverLimit && !isSubmitting && slowmodeRemaining === 0;

  // Rich text formatting functions
  const insertFormatting = useCallback((prefix: string, suffix: string = prefix, placeholder: string = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newContent = content.substring(0, start) + prefix + textToInsert + suffix + content.substring(end);
    setContent(newContent);

    // Set cursor position after the inserted text
    setTimeout(() => {
      const newCursorPos = start + prefix.length + textToInsert.length;
      textarea.setSelectionRange(
        selectedText ? newCursorPos : start + prefix.length,
        selectedText ? newCursorPos : start + prefix.length + placeholder.length
      );
      textarea.focus();
    }, 0);
  }, [content]);

  const insertLinePrefix = useCallback((prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    if (selectedText) {
      // Add prefix to each line of selection
      const lines = selectedText.split('\n');
      const formattedLines = lines.map(line => prefix + line);
      const newContent = content.substring(0, start) + formattedLines.join('\n') + content.substring(end);
      setContent(newContent);
    } else {
      // Insert prefix at current line start
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);
      setContent(newContent);
      setTimeout(() => {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
        textarea.focus();
      }, 0);
    }
  }, [content]);

  const toggleSpoiler = useCallback(() => {
    insertFormatting('||', '||', 'spoiler');
  }, [insertFormatting]);

  const formatBold = useCallback(() => insertFormatting('**', '**', 'bold text'), [insertFormatting]);
  const formatItalic = useCallback(() => insertFormatting('*', '*', 'italic text'), [insertFormatting]);
  const formatUnderline = useCallback(() => insertFormatting('__', '__', 'underlined'), [insertFormatting]);
  const formatStrikethrough = useCallback(() => insertFormatting('~~', '~~', 'strikethrough'), [insertFormatting]);
  const formatCode = useCallback(() => insertFormatting('`', '`', 'code'), [insertFormatting]);
  const formatCodeBlock = useCallback(() => insertFormatting('```\n', '\n```', 'code block'), [insertFormatting]);
  const formatLink = useCallback(() => insertFormatting('[', '](url)', 'link text'), [insertFormatting]);
  const formatQuote = useCallback(() => insertLinePrefix('> '), [insertLinePrefix]);
  const formatHeading = useCallback(() => insertLinePrefix('### '), [insertLinePrefix]);
  const formatBulletList = useCallback(() => insertLinePrefix('- '), [insertLinePrefix]);
  const formatNumberedList = useCallback(() => insertLinePrefix('1. '), [insertLinePrefix]);
  const formatCheckbox = useCallback(() => insertLinePrefix('- [ ] '), [insertLinePrefix]);

  return (
    <div className="px-4 pb-6">
      {/* Reply/Edit indicator */}
      {(replyingTo || isEditing) && (
        <div className="flex items-center justify-between px-4 py-2 bg-background-surface rounded-t-lg border-b border-border">
          <div className="flex items-center gap-2 text-sm">
            {isEditing ? (
              <>
                <span className="text-foreground-muted">Editing message from</span>
                <span className="font-medium">{user?.username}</span>
              </>
            ) : replyingTo ? (
              <>
                <span className="text-foreground-muted">Replying to</span>
                <span
                  className="font-medium"
                  style={{ color: replyingTo.author.color }}
                >
                  {replyingTo.author.username}
                </span>
              </>
            ) : null}
          </div>
          <button
            onClick={isEditing ? cancelEdit : cancelReply}
            className="p-1 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-background-surface rounded-t-lg border-b border-border">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="relative flex items-center gap-2 px-2 py-1 bg-background rounded border border-border"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4 text-accent" />
              ) : (
                <FileText className="w-4 h-4 text-foreground-muted" />
              )}
              <span className="text-sm truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="p-0.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        className={`relative flex items-end gap-2 bg-background-surface rounded-lg border transition-colors ${
          isEditing ? 'rounded-t-none' : ''
        } ${isOverLimit ? 'border-error' : 'border-border focus-within:border-accent'}`}
      >
        {/* File upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 text-foreground-muted hover:text-foreground transition-colors"
          title="Upload file"
        >
          <PlusCircle className="w-5 h-5" />
        </button>

        {/* Formatting toggle button */}
        <button
          type="button"
          onClick={() => setShowFormatting(!showFormatting)}
          className={`p-3 transition-colors ${showFormatting ? 'text-accent' : 'text-foreground-muted hover:text-foreground'}`}
          title="Formatting"
        >
          <Code className="w-5 h-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
        />

        {/* Formatting toolbar */}
        {showFormatting && (
          <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border mb-1 flex-wrap">
            <button
              type="button"
              onClick={formatBold}
              className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={formatItalic}
              className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={formatUnderline}
              className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
              title="Underline"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={formatStrikethrough}
              className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              type="button"
              onClick={formatCode}
              className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
              title="Inline code"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={formatLink}
              className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
              title="Link"
            >
              <Link2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleSpoiler}
              className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
              title="Spoiler"
            >
              <Eye className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              type="button"
              onClick={formatHeading}
              className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
              title="Heading"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={formatQuote}
              className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              type="button"
              onClick={formatBulletList}
              className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
              title="Bullet list"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={formatNumberedList}
              className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
              title="Numbered list"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={formatCheckbox}
              className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
              title="Checkbox"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Textarea */}
        <div className="flex-1 relative py-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channel?.name || 'channel'}`}
            className="w-full bg-transparent resize-none outline-none text-sm placeholder:text-foreground-subtle min-h-[40px] max-h-[200px]"
            rows={1}
            disabled={slowmodeRemaining > 0}
          />

          {/* Mention autocomplete */}
          {showMentions && (
            <div className="absolute bottom-full left-0 mb-2 w-full max-w-xs bg-background-elevated rounded-lg border border-border shadow-xl overflow-hidden">
              <div className="p-2 text-xs text-foreground-muted border-b border-border">
                Mention someone
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <button
                      key={member.userId}
                      onClick={() => {
                        const lastAtIndex = content.lastIndexOf('@');
                        setContent(content.slice(0, lastAtIndex) + `@${member.username} `);
                        setShowMentions(false);
                        textareaRef.current?.focus();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-background-surface transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-background"
                        style={{ backgroundColor: '#00E5CC' }}
                      >
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          member.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{member.displayName || member.username}</span>
                        {member.displayName && (
                          <span className="text-xs text-foreground-muted">{member.username}</span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-foreground-muted">
                    No members found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 bg-background-elevated rounded-lg border border-border shadow-xl overflow-hidden">
              <div className="p-2 border-b border-border">
                <input
                  type="text"
                  placeholder="Search emoji..."
                  className="w-full px-2 py-1 text-sm bg-background-surface rounded border border-border focus:border-accent focus:outline-none"
                />
              </div>
              <div className="p-2 max-h-64 overflow-y-auto">
                {EMOJI_CATEGORIES.map((category, i) => (
                  <div key={i} className="grid grid-cols-10 gap-1 mb-2">
                    {category.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-background-surface rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sticker picker */}
          {showStickerPicker && (
            <div className="absolute bottom-full right-0 mb-2">
              <StickerPicker
                onStickerSelect={handleStickerSelect}
                onClose={() => setShowStickerPicker(false)}
              />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 pr-2 pb-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 rounded text-foreground-muted hover:text-foreground transition-colors"
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowStickerPicker(!showStickerPicker)}
            className={`p-1.5 rounded transition-colors ${showStickerPicker ? 'text-accent' : 'text-foreground-muted hover:text-foreground'}`}
            title="Stickers"
          >
            <Sticker className="w-5 h-5" />
          </button>
          <button
            className="p-1.5 rounded text-foreground-muted hover:text-foreground transition-colors"
            title="Gift"
          >
            <Gift className="w-5 h-5" />
          </button>

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className={`p-2 rounded transition-colors ${
              canSend
                ? 'bg-accent text-background hover:bg-accent-hover'
                : 'bg-background-surface text-foreground-muted cursor-not-allowed'
            }`}
            title="Send message"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Character count / Slowmode */}
      <div className="flex justify-between items-center mt-1 px-2 text-xs">
        {slowmodeRemaining > 0 ? (
          <span className="text-warning">Slowmode: {slowmodeRemaining}s</span>
        ) : (
          <span />
        )}
        {charCount > maxChars - 100 && (
          <span className={isOverLimit ? 'text-error' : 'text-foreground-muted'}>
            {charCount}/{maxChars}
          </span>
        )}
      </div>
    </div>
  );
}
