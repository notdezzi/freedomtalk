'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// Common emoji list - in production this would come from server/custom emojis
const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '🤯', '😱', '🥵', '🥶', '😳', '🤡', '👻', '👽', '🤖'],
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🙏'],
  },
  {
    name: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💗', '💖', '💘', '💝', '💟'],
  },
  {
    name: 'Objects',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🏆', '🎮', '🎯', '🎲', '📱', '💻', '⌨️', '🖥️', '📷', '📹', '🎥', '📺', '📻', '🎧', '🎤', '🎵', '🎶', '🔔', '💡', '🔦', '📚', '📝', '✏️', '🖊️', '📌', '📎', '✂️', '🔒', '🔓', '🔑', '🔨', '⚡', '🔥', '💥', '⭐', '🌟', '✨', '💫', '🌸', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳'],
  },
];

export interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
}

export function ReactionPicker({ onSelect, onClose, position }: ReactionPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const filteredEmojis = search
    ? EMOJI_CATEGORIES.flatMap((cat) => cat.emojis).filter(() => true) // Would filter by emoji names in production
    : EMOJI_CATEGORIES[activeCategory].emojis;

  // Quick reaction buttons
  const quickReactions = ['👍', '👎', '😂', '❤️', '🎉', '🚀'];

  const content = (
    <div
      ref={containerRef}
      className={cn(
        'z-50 w-80 rounded-lg bg-background-elevated shadow-xl border border-border',
        'animate-in fade-in-0 zoom-in-95'
      )}
      style={position ? { position: 'fixed', left: position.x, top: position.y } : { position: 'relative' }}
    >
      {/* Search */}
      <div className="p-2 border-b border-border">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji..."
          className="w-full rounded bg-background-surface px-2 py-1 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent"
          autoFocus
        />
      </div>

      {/* Quick reactions */}
      {!search && (
        <div className="flex items-center justify-center gap-1 p-2 border-b border-border">
          {quickReactions.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="rounded p-1.5 text-xl hover:bg-background-surface"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Category tabs */}
      {!search && (
        <div className="flex border-b border-border">
          {EMOJI_CATEGORIES.map((cat, index) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(index)}
              className={cn(
                'flex-1 px-2 py-1.5 text-xs font-medium transition-colors',
                activeCategory === index
                  ? 'text-foreground bg-background-surface'
                  : 'text-foreground-muted hover:text-foreground'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="max-h-48 overflow-y-auto p-2">
        <div className="grid grid-cols-8 gap-0.5">
          {filteredEmojis.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => onSelect(emoji)}
              className="rounded p-1 text-lg hover:bg-background-surface transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (position) {
    return createPortal(content, document.body);
  }

  return content;
}
