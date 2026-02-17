'use client';

import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘'],
  'Gestures': ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '👋', '🤙', '💪', '👊', '✋', '🤚', '👋', '🙏', '🤲'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💗', '💓', '💞', '💘', '💝', '💟'],
  'Objects': ['🎉', '🎊', '✨', '🌟', '💥', '💫', '🎁', '🏆', '🎮', '🚀', '💻', '📱', '💡', '📌', '🎯', '📝'],
  'Symbols': ['💯', '⚠️', '❌', '✅', '❓', '❗', '🔥', '⚡', '💎', '🌈', '☀️', '🌙', '⭐', '🎵', '🔔', '💬'],
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥'];

export default function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Smileys');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  const filteredEmojis = search
    ? Object.values(EMOJI_CATEGORIES).flat().filter((emoji) => {
        // Basic emoji search - could be enhanced with emoji names
        return emoji.includes(search);
      })
    : EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES];

  return (
    <div
      ref={pickerRef}
      className="bg-background-elevated rounded-lg border border-border shadow-xl overflow-hidden w-72"
    >
      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji..."
            className="w-full pl-8 pr-2 py-1.5 text-sm bg-background-surface rounded border border-border focus:border-accent focus:outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* Quick reactions */}
      {!search && (
        <div className="p-2 border-b border-border">
          <div className="text-xs text-foreground-muted mb-1 px-1">Quick Reactions</div>
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-background-surface rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category tabs */}
      {!search && (
        <div className="flex border-b border-border overflow-x-auto">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === category
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-2 max-h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-0.5">
          {filteredEmojis?.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => handleEmojiClick(emoji)}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-background-surface rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
        {filteredEmojis?.length === 0 && (
          <div className="text-center text-foreground-muted py-4 text-sm">
            No emoji found
          </div>
        )}
      </div>
    </div>
  );
}
