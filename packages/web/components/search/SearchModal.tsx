'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Hash, User, Server, MessageCircle, Loader2, Clock } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

interface SearchResult {
  type: 'message' | 'user' | 'server';
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  serverId?: string;
  channelId?: string;
}

export default function SearchModal() {
  const { activeModal, closeModal } = useUIStore();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isOpen = activeModal.type === 'invite-people';

  // Load recent searches from localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Search when query changes
  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await apiClient.search({ query: query.trim() });
        if (response.success && response.data) {
          const data = response.data as { messages?: unknown[]; users?: unknown[]; servers?: unknown[] };
          const searchResults: SearchResult[] = [];

          // Add messages
          if (data.messages) {
            (data.messages as unknown[]).forEach((msg: unknown) => {
              const m = msg as Record<string, unknown>;
              searchResults.push({
                type: 'message',
                id: String(m.id),
                title: String(m.content || '').slice(50),
                subtitle: `#${m.channelId}`,
                serverId: String(m.serverId || ''),
                channelId: String(m.channelId || ''),
              });
            });
          }

          // Add users
          if (data.users) {
            (data.users as unknown[]).forEach((user: unknown) => {
              const u = user as Record<string, unknown>;
              searchResults.push({
                type: 'user',
                id: String(u.id),
                title: String(u.displayName || u.username),
                subtitle: `@${u.username}`,
                icon: u.avatar as string | undefined,
              });
            });
          }

          // Add servers
          if (data.servers) {
            (data.servers as unknown[]).forEach((server: unknown) => {
              const s = server as Record<string, unknown>;
              searchResults.push({
                type: 'server',
                id: String(s.id),
                title: String(s.name),
                subtitle: `${s.memberCount} members`,
                icon: s.icon as string | undefined,
              });
            });
          }

          setResults(searchResults);
        }
      } catch (err) {
        console.error('Search error:', err);
      }
      setLoading(false);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex]);
          }
          break;
        case 'Escape':
          closeModal();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, closeModal]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeModal]);

  const handleSelectResult = useCallback((result: SearchResult) => {
    // Save to recent searches
    const newSearches = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
    setRecentSearches(newSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newSearches));

    // Navigate based on result type
    switch (result.type) {
      case 'message':
        if (result.serverId && result.channelId) {
          router.push(`/app/servers/${result.serverId}/channels/${result.channelId}`);
        }
        break;
      case 'user':
        // Open user profile or DM
        router.push(`/app/dms?user=${result.id}`);
        break;
      case 'server':
        router.push(`/app/servers/${result.id}`);
        break;
    }

    closeModal();
  }, [query, recentSearches, router, closeModal]);

  const handleRecentSearch = (search: string) => {
    setQuery(search);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-background-elevated rounded-lg shadow-xl overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="w-5 h-5 text-foreground-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search messages, users, servers..."
            className="flex-1 bg-transparent text-foreground placeholder:text-foreground-muted focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-foreground-muted" />}
          <button
            onClick={closeModal}
            className="p-1 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelectResult(result)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-accent/10 text-accent'
                      : 'hover:bg-background-surface text-foreground'
                  }`}
                >
                  {result.type === 'message' && <MessageCircle className="w-4 h-4 text-foreground-muted" />}
                  {result.type === 'user' && <User className="w-4 h-4 text-foreground-muted" />}
                  {result.type === 'server' && <Server className="w-4 h-4 text-foreground-muted" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-foreground-muted truncate">{result.subtitle}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query ? (
            !loading && (
              <div className="py-8 text-center text-foreground-muted">
                No results found for "{query}"
              </div>
            )
          ) : recentSearches.length > 0 ? (
            <div className="py-2">
              <p className="px-4 py-2 text-xs font-semibold text-foreground-muted uppercase">
                Recent Searches
              </p>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearch(search)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-background-surface transition-colors"
                >
                  <Clock className="w-4 h-4 text-foreground-muted" />
                  <span className="text-sm">{search}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-foreground-muted">
              Type to search
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-foreground-muted">
          <span><kbd className="px-1.5 py-0.5 bg-background-surface rounded">↑↓</kbd> to navigate</span>
          <span><kbd className="px-1.5 py-0.5 bg-background-surface rounded">↵</kbd> to select</span>
          <span><kbd className="px-1.5 py-0.5 bg-background-surface rounded">esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
