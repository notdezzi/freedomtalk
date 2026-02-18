'use client';

import { useState, useMemo } from 'react';
import { X, Search, Clock, Package } from 'lucide-react';

interface Sticker {
  id: string;
  name: string;
  packId: string;
  packName: string;
  url: string;
  format: 'png' | 'gif' | 'lottie';
  tags: string[];
}

interface StickerPack {
  id: string;
  name: string;
  stickers: Sticker[];
  coverStickerId: string;
}

// Mock sticker data for demo
const MOCK_STICKER_PACKS: StickerPack[] = [
  {
    id: 'pack_1',
    name: 'Emoji Fun',
    coverStickerId: 'sticker_1_1',
    stickers: [
      { id: 'sticker_1_1', name: 'Wave', packId: 'pack_1', packName: 'Emoji Fun', url: '/stickers/wave.png', format: 'png', tags: ['wave', 'hello', 'hi'] },
      { id: 'sticker_1_2', name: 'Thumbs Up', packId: 'pack_1', packName: 'Emoji Fun', url: '/stickers/thumbsup.png', format: 'png', tags: ['yes', 'ok', 'good'] },
      { id: 'sticker_1_3', name: 'Heart', packId: 'pack_1', packName: 'Emoji Fun', url: '/stickers/heart.png', format: 'png', tags: ['love', 'heart'] },
    ],
  },
  {
    id: 'pack_2',
    name: 'Cool Cats',
    coverStickerId: 'sticker_2_1',
    stickers: [
      { id: 'sticker_2_1', name: 'Cool Cat', packId: 'pack_2', packName: 'Cool Cats', url: '/stickers/coolcat.png', format: 'png', tags: ['cool', 'cat', 'awesome'] },
      { id: 'sticker_2_2', name: 'Sleepy Cat', packId: 'pack_2', packName: 'Cool Cats', url: '/stickers/sleepycat.png', format: 'png', tags: ['sleep', 'tired', 'cat'] },
    ],
  },
];

// Recently used stickers (would be stored in localStorage)
function getRecentlyUsed(): Sticker[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('recentlyUsedStickers');
  if (saved) {
    return JSON.parse(saved);
  }
  return [];
}

function saveRecentlyUsed(stickers: Sticker[]): void {
  localStorage.setItem('recentlyUsedStickers', JSON.stringify(stickers.slice(0, 20)));
}

interface StickerPickerProps {
  onStickerSelect: (sticker: Sticker) => void;
  onClose: () => void;
}

/**
 * StickerPicker - Component for selecting stickers to send in messages
 */
export default function StickerPicker({ onStickerSelect, onClose }: StickerPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [recentlyUsed, setRecentlyUsed] = useState<Sticker[]>(getRecentlyUsed());

  // Get all stickers from all packs for search
  const allStickers = useMemo(() => {
    return MOCK_STICKER_PACKS.flatMap((pack) => pack.stickers);
  }, []);

  // Filter stickers based on search
  const filteredStickers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allStickers.filter(
      (sticker) =>
        sticker.name.toLowerCase().includes(query) ||
        sticker.tags.some((tag) => tag.includes(query))
    );
  }, [searchQuery, allStickers]);

  // Get stickers to display
  const displayStickers = useMemo(() => {
    if (searchQuery.trim()) {
      return filteredStickers;
    }
    if (selectedPackId) {
      const pack = MOCK_STICKER_PACKS.find((p) => p.id === selectedPackId);
      return pack?.stickers || [];
    }
    return recentlyUsed;
  }, [searchQuery, filteredStickers, selectedPackId, recentlyUsed]);

  // Handle sticker selection
  const handleStickerClick = (sticker: Sticker) => {
    // Update recently used
    const newRecentlyUsed = [
      sticker,
      ...recentlyUsed.filter((s) => s.id !== sticker.id),
    ].slice(0, 20);
    setRecentlyUsed(newRecentlyUsed);
    saveRecentlyUsed(newRecentlyUsed);

    onStickerSelect(sticker);
    onClose();
  };

  // Get title for current view
  const getViewTitle = () => {
    if (searchQuery.trim()) return 'Search Results';
    if (selectedPackId) {
      const pack = MOCK_STICKER_PACKS.find((p) => p.id === selectedPackId);
      return pack?.name || 'Stickers';
    }
    return 'Recently Used';
  };

  return (
    <div className="w-80 h-96 rounded-lg shadow-xl overflow-hidden flex flex-col bg-background-elevated">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-foreground">Stickers</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedPackId(null);
            }}
            placeholder="Search stickers..."
            className="w-full pl-8 pr-3 py-2 rounded text-sm bg-background text-foreground placeholder:text-foreground-subtle border border-border focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Stickers Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {displayStickers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-foreground-muted">
            {searchQuery.trim() ? (
              <>
                <Search className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">No stickers found</p>
              </>
            ) : selectedPackId ? (
              <>
                <Package className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">No stickers in this pack</p>
              </>
            ) : (
              <>
                <Clock className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">No recently used stickers</p>
                <p className="text-xs mt-1">Select a pack below to browse</p>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs font-medium mb-2 text-foreground-muted">
              {getViewTitle()}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {displayStickers.map((sticker) => (
                <button
                  key={sticker.id}
                  onClick={() => handleStickerClick(sticker)}
                  className="aspect-square rounded p-1 transition-transform hover:scale-110 hover:bg-background-surface"
                  title={sticker.name}
                >
                  {/* Placeholder for actual sticker image */}
                  <div className="w-full h-full rounded flex items-center justify-center text-2xl bg-background-surface">
                    {sticker.format === 'lottie' ? '🎬' : sticker.format === 'gif' ? '🎞️' : '🖼️'}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sticker Packs Bar */}
      <div className="flex items-center gap-1 p-2 border-t border-border bg-background-surface overflow-x-auto">
        {/* Recently Used */}
        <button
          onClick={() => {
            setSelectedPackId(null);
            setSearchQuery('');
          }}
          className={`p-2 rounded flex-shrink-0 ${
            !selectedPackId && !searchQuery
              ? 'bg-accent/20 text-accent'
              : 'hover:bg-background text-foreground-muted hover:text-foreground'
          }`}
          title="Recently Used"
        >
          <Clock className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Pack Icons */}
        {MOCK_STICKER_PACKS.map((pack) => {
          return (
            <button
              key={pack.id}
              onClick={() => {
                setSelectedPackId(pack.id);
                setSearchQuery('');
              }}
              className={`p-2 rounded flex-shrink-0 ${
                selectedPackId === pack.id
                  ? 'bg-accent/20 text-accent'
                  : 'hover:bg-background text-foreground-muted hover:text-foreground'
              }`}
              title={pack.name}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center text-xs bg-background">
                {pack.name.charAt(0)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { Sticker, StickerPack };
