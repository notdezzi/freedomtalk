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
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageInput({
  channelId,
  onSend,
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
    },
    [content, attachments, disabled, onSend]
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
              className="flex items-center gap-2 rounded bg-gray-700 px-2 py-1 text-sm"
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="relative flex items-end gap-2 rounded-lg bg-gray-700 p-2">
        {/* Left buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-600 hover:text-white"
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
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none bg-transparent text-white placeholder-gray-400',
              'focus:outline-none',
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
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-600 text-gray-400'
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
      className="rounded p-1.5 text-gray-400 hover:bg-gray-600 hover:text-white"
      title={title}
    >
      {icon}
    </button>
  );
}
