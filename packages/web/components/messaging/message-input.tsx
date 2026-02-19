'use client';

import { useState, useRef, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import {
  Send,
  Plus,
  Image,
  Smile,
  Paperclip,
  AtSign,
  Bold,
  Italic,
  Code,
} from 'lucide-react';

export interface MessageInputProps {
  channelId: string;
  onSend: (content: string, attachments?: File[]) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageInput({
  channelId,
  onSend,
  onTypingStart,
  onTypingStop,
  disabled,
  placeholder = 'Message #general',
  className,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();

      if ((!content.trim() && attachments.length === 0) || disabled) return;

      onSend(content.trim(), attachments);
      setContent('');
      setAttachments([]);
      // Stop typing when sending
      onTypingStop?.();
    },
    [content, attachments, disabled, onSend, onTypingStop]
  );

  // Handle content changes and send typing indicator
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const wasEmpty = content.trim().length === 0;
      const isNowEmpty = newValue.trim().length === 0;

      setContent(newValue);

      // Send typing start when user starts typing
      if (wasEmpty && !isNowEmpty) {
        onTypingStart?.();
      }
      // Send typing stop when user clears the input
      if (!wasEmpty && isNowEmpty) {
        onTypingStop?.();
      }
    },
    [content, onTypingStart, onTypingStop]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      setAttachments((prev) => [...prev, ...files]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    []
  );

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const insertFormatting = useCallback((format: 'bold' | 'italic' | 'code') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let formattedText: string;
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'code':
        formattedText = `\`${selectedText}\``;
        break;
    }

    setContent(content.substring(0, start) + formattedText + content.substring(end));

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  }, [content]);

  return (
    <div className={cn('p-4', className)}>
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded bg-background-surface px-2 py-1 text-sm"
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-foreground-muted hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="relative flex items-end gap-2 rounded-lg bg-background-surface p-2">
        {/* Left buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded p-1.5 text-foreground-muted hover:bg-background-elevated hover:text-foreground"
            title="Attach file"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Textarea */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none bg-transparent text-foreground placeholder:text-foreground-muted',
              'focus:outline-none focus:ring-0 focus:border-0 no-focus-ring',
              'max-h-48 min-h-[24px]'
            )}
            style={{
              height: 'auto',
              overflow: content.split('\n').length > 4 ? 'auto' : 'hidden',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
            }}
          />
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-1">
          {/* Formatting buttons */}
          <div className="hidden sm:flex items-center gap-0.5 mr-1">
            <TooltipButton
              icon={<Bold className="h-4 w-4" />}
              title="Bold"
              onClick={() => insertFormatting('bold')}
            />
            <TooltipButton
              icon={<Italic className="h-4 w-4" />}
              title="Italic"
              onClick={() => insertFormatting('italic')}
            />
            <TooltipButton
              icon={<Code className="h-4 w-4" />}
              title="Code"
              onClick={() => insertFormatting('code')}
            />
          </div>

          <TooltipButton
            icon={<Smile className="h-5 w-5" />}
            title="Emoji"
            onClick={() => {}}
          />

          <button
            onClick={() => handleSubmit()}
            disabled={disabled || (!content.trim() && attachments.length === 0)}
            className={cn(
              'rounded p-1.5 transition-colors',
              content.trim() || attachments.length > 0
                ? 'bg-accent text-foreground hover:bg-accent-hover'
                : 'bg-background-elevated text-foreground-muted'
            )}
            title="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}

function TooltipButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded p-1.5 text-foreground-muted hover:bg-background-elevated hover:text-foreground"
      title={title}
    >
      {icon}
    </button>
  );
}
