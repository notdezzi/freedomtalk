'use client';

import { useMessageStore } from '@/stores/messageStore';

interface TypingIndicatorProps {
  channelId: string;
}

export default function TypingIndicator({ channelId }: TypingIndicatorProps) {
  const { typingUsers } = useMessageStore();

  const typing = typingUsers[channelId] || [];

  if (typing.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (typing.length === 1) {
      return (
        <>
          <span className="font-medium">{typing[0].username}</span>
          <span> is typing...</span>
        </>
      );
    }

    if (typing.length === 2) {
      return (
        <>
          <span className="font-medium">{typing[0].username}</span>
          <span> and </span>
          <span className="font-medium">{typing[1].username}</span>
          <span> are typing...</span>
        </>
      );
    }

    return (
      <>
        <span className="font-medium">{typing[0].username}</span>
        <span> and </span>
        <span className="font-medium">{typing.length - 1} others</span>
        <span> are typing...</span>
      </>
    );
  };

  return (
    <div className="px-4 py-1 flex items-center gap-2 text-sm text-foreground-muted">
      {/* Animated dots */}
      <div className="flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full bg-foreground-muted animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-foreground-muted animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-foreground-muted animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>

      {/* Typing text */}
      <span>{getTypingText()}</span>
    </div>
  );
}
