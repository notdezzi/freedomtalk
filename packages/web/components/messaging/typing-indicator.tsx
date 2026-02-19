'use client';

import { cn } from '@/lib/utils';
import type { TypingUser } from '@/types';

interface TypingIndicatorProps {
  users: TypingUser[];
  className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getText = () => {
    const names = users.map((u) => u.username);

    if (names.length === 1) {
      return (
        <>
          <span className="font-medium">{names[0]}</span>
          <span> is typing</span>
        </>
      );
    }

    if (names.length === 2) {
      return (
        <>
          <span className="font-medium">{names[0]}</span>
          <span> and </span>
          <span className="font-medium">{names[1]}</span>
          <span> are typing</span>
        </>
      );
    }

    return (
      <>
        <span className="font-medium">{names.slice(0, 2).join(', ')}</span>
        <span> and </span>
        <span className="font-medium">{names.length - 2} others</span>
        <span> are typing</span>
      </>
    );
  };

  return (
    <div className={cn('flex items-center gap-2 px-4 py-1 text-sm text-gray-400', className)}>
      <TypingDots />
      <span>{getText()}</span>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
    </div>
  );
}
