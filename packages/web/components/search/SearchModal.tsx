'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, Hash, User, Server, MessageCircle, Loader2, Clock, Calendar, Paperclip, Filter } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useServerStore } from '@/stores/serverStore';
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
  content?: string;
  authorId?: string;
  authorName?: string;
  hasAttachment?: boolean;
  createdAt?: string;
}

interface SearchFilters {
  fromUser?: string;
  hasAttachment?: boolean;
  dateFrom?: string;
  dateTo?: string;
  inChannel?: string;
  inServer?: string;
}

// Parse search query for filters
function parseSearchQuery(query: string): { searchTerm: string; filters: SearchFilters } {
  const filters: SearchFilters = {};
  let searchTerm = query;

  // Extract from:user filter
  const fromMatch = searchTerm.match(/from:(\S+)/i);
  if (fromMatch) {
    filters.fromUser = fromMatch[1];
    searchTerm = searchTerm.replace(fromMatch[0], '').trim();
  }

  // Extract has:attachment filter
  if (searchTerm.match(/has:attachment/i)) {
    filters.hasAttachment = true;
    searchTerm = searchTerm.replace(/has:attachment/i, '').trim();
  }

  // Extract date filters (after:YYYY-MM-DD or before:YYYY-MM-DD)
  const afterMatch = searchTerm.match(/after:(\d{4}-\d{2}-\d{2})/i);
  if (afterMatch) {
    filters.dateFrom = afterMatch[1];
    searchTerm = searchTerm.replace(afterMatch[0], '').trim();
  }

  const beforeMatch = searchTerm.match(/before:(\d{4}-\d{2}-\d{2})/i);
  if (beforeMatch) {
    filters.dateTo = beforeMatch[1];
    searchTerm = searchTerm.replace(beforeMatch[0], '').trim();
  }

  // Extract in:channel filter
  const inMatch = searchTerm.match(/in:(\S+)/i);
  if (inMatch) {
    filters.inChannel = inMatch[1];
    searchTerm = searchTerm.replace(inMatch[0], '').trim();
  }

  return { searchTerm, filters };
}

// Highlight search terms in text
function highlightText(text: string, searchTerms: string): React.ReactNode {
  if (!searchTerms.trim()) return text;

  const terms = searchTerms.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;

  const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    terms.some(t => part.toLowerCase() === t)
      ? <mark key={i} className="bg-accent/30 text-foreground rounded px-0.5">{part}</mark>
      : part
  );
}

// Get suggestions based on query
function getSuggestions(query: string): string[] {
  const suggestions: string[] = [];
  const lowerQuery = query.toLowerCase();

  if (!query.includes('from:') && lowerQuery.length > 0) {
    suggestions.push(`${query} from:@username`);
  }
  if (!query.includes('has:') && lowerQuery.length > 0) {
    suggestions.push(`${query} has:attachment`);
  }
  if (!query.includes('after:') && lowerQuery.length > 0) {
    suggestions.push(`${query} after:2024-01-01`);
  }
  if (!query.includes('in:') && lowerQuery.length > 0) {
    suggestions.push(`${query} in:#channel-name`);
  }

  return suggestions.slice(0, 4);
}

export default function SearchModal() {
  const { activeModal, closeModal } = useUIStore();
  const { servers } = useServerStore();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isOpen = activeModal.type === 'search';

  // Parse query and extract filters
  const parsedQuery = useMemo(() => parseSearchQuery(query), [query]);

  // Get suggestions for current query
  const suggestions = useMemo(() => getSuggestions(query), [query]);

  // Load recent searches from localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
      inputRef.current?.focus();
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Search when query changes
  useEffect(() => {
    const search = async () => {
      const { searchTerm, filters: parsedFilters } = parsedQuery;

      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await apiClient.search({
          query: searchTerm,
          ...parsedFilters,
        });

        if (response.success && response.data) {
          const data = response.data as { messages?: unknown[]; users?: unknown[]; servers?: unknown[] };
          const searchResults: SearchResult[] = [];

          // Add messages
          if (data.messages) {
            (data.messages as unknown[]).forEach((msg: unknown) => {
              const m = msg as Record<string, unknown>;
              const content = String(m.content || '');
              searchResults.push({
                type: 'message',
                id: String(m.id),
                title: content.slice(0, 100),
                content: content,
                subtitle: `#${m.channelName || m.channelId}`,
                serverId: String(m.serverId || ''),
                channelId: String(m.channelId || ''),
                authorId: String(m.authorId || ''),
                authorName: String(m.authorName || 'Unknown'),
                hasAttachment: Boolean(m.hasAttachment),
                createdAt: m.createdAt ? String(m.createdAt) : undefined,
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

          // Add servers - only show servers the user has joined
          if (data.servers) {
            const joinedServerIds = new Set(servers.map(s => s.id));
            (data.servers as unknown[]).forEach((server: unknown) => {
              const s = server as Record<string, unknown>;
              // Only include servers that the user has joined
              if (joinedServerIds.has(String(s.id))) {
                searchResults.push({
                  type: 'server',
                  id: String(s.id),
                  title: String(s.name),
                  subtitle: `${s.memberCount} members`,
                  icon: s.icon as string | undefined,
                });
              }
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
  }, [parsedQuery, servers]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length + suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex < suggestions.length && suggestions[selectedIndex]) {
            setQuery(suggestions[selectedIndex]);
          } else if (results[selectedIndex - suggestions.length]) {
            handleSelectResult(results[selectedIndex - suggestions.length]);
          }
          break;
        case 'Escape':
          closeModal();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, suggestions, selectedIndex, closeModal]);

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

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  const applyQuickFilter = (filter: string) => {
    if (!query.includes(filter)) {
      setQuery(`${query} ${filter}`);
    }
  };

  if (!isOpen) return null;

  const { searchTerm } = parsedQuery;

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
            placeholder="Search messages, users, servers... (try from:@user, has:attachment, after:2024-01-01)"
            className="flex-1 bg-transparent text-foreground placeholder:text-foreground-subtle focus:outline-none text-sm"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded transition-colors ${showFilters ? 'bg-accent/20 text-accent' : 'hover:bg-background-surface text-foreground-muted'}`}
            title="Filters"
          >
            <Filter className="w-4 h-4" />
          </button>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-foreground-muted" />}
          <button
            onClick={closeModal}
            className="p-1 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Filters */}
        {showFilters && (
          <div className="px-4 py-2 border-b border-border bg-background-surface/50 flex flex-wrap gap-2">
            <button
              onClick={() => applyQuickFilter('has:attachment')}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-background hover:bg-accent/20 hover:text-accent transition-colors"
            >
              <Paperclip className="w-3 h-3" />
              Has Attachment
            </button>
            <button
              onClick={() => applyQuickFilter('after:2024-01-01')}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-background hover:bg-accent/20 hover:text-accent transition-colors"
            >
              <Calendar className="w-3 h-3" />
              Date Range
            </button>
            <button
              onClick={() => applyQuickFilter('from:@')}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-background hover:bg-accent/20 hover:text-accent transition-colors"
            >
              <User className="w-3 h-3" />
              From User
            </button>
            <button
              onClick={() => applyQuickFilter('in:#')}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-background hover:bg-accent/20 hover:text-accent transition-colors"
            >
              <Hash className="w-3 h-3" />
              In Channel
            </button>
          </div>
        )}

        {/* Active Filters Display */}
        {(parsedQuery.filters.fromUser || parsedQuery.filters.hasAttachment || parsedQuery.filters.dateFrom) && (
          <div className="px-4 py-2 border-b border-border bg-accent/5 flex flex-wrap gap-2">
            <span className="text-xs text-foreground-muted">Filters:</span>
            {parsedQuery.filters.fromUser && (
              <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded">
                from:{parsedQuery.filters.fromUser}
              </span>
            )}
            {parsedQuery.filters.hasAttachment && (
              <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded">
                has:attachment
              </span>
            )}
            {parsedQuery.filters.dateFrom && (
              <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded">
                after:{parsedQuery.filters.dateFrom}
              </span>
            )}
          </div>
        )}

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {/* Suggestions */}
          {query && suggestions.length > 0 && results.length === 0 && !loading && (
            <div className="py-2 border-b border-border">
              <p className="px-4 py-1 text-xs font-semibold text-foreground-muted uppercase">
                Suggestions
              </p>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-accent/10 text-accent'
                      : 'hover:bg-background-surface text-foreground-muted'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span className="text-sm">{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelectResult(result)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                    index + suggestions.length === selectedIndex
                      ? 'bg-accent/10 text-accent'
                      : 'hover:bg-background-surface text-foreground'
                  }`}
                >
                  {result.type === 'message' && <MessageCircle className="w-4 h-4 text-foreground-muted mt-0.5" />}
                  {result.type === 'user' && <User className="w-4 h-4 text-foreground-muted mt-0.5" />}
                  {result.type === 'server' && <Server className="w-4 h-4 text-foreground-muted mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {result.type === 'message'
                          ? highlightText(result.title, searchTerm)
                          : result.title}
                      </p>
                      {result.hasAttachment && (
                        <Paperclip className="w-3 h-3 text-foreground-muted" />
                      )}
                    </div>
                    {result.subtitle && (
                      <p className="text-xs text-foreground-muted truncate mt-0.5">
                        {result.authorName && <span className="font-medium">{result.authorName}</span>}
                        {result.authorName && ' in '}
                        {result.subtitle}
                      </p>
                    )}
                    {/* Context for messages */}
                    {result.type === 'message' && result.content && result.content.length > 100 && (
                      <p className="text-xs text-foreground-subtle truncate mt-1">
                        {highlightText(result.content.slice(0, 150), searchTerm)}...
                      </p>
                    )}
                  </div>
                  {result.createdAt && (
                    <span className="text-xs text-foreground-muted">
                      {new Date(result.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : query && !loading && suggestions.length === 0 ? (
            <div className="py-8 text-center text-foreground-muted">
              No results found for &quot;{searchTerm}&quot;
              {Object.keys(parsedQuery.filters).length > 0 && (
                <p className="text-xs mt-1">Try removing some filters</p>
              )}
            </div>
          ) : !query && recentSearches.length > 0 ? (
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
          ) : !query ? (
            <div className="py-8 text-center text-foreground-muted">
              <p>Type to search</p>
              <p className="text-xs mt-1 text-foreground-subtle">
                Use filters: from:@user, has:attachment, after:YYYY-MM-DD
              </p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-foreground-muted">
          <span><kbd className="px-1.5 py-0.5 bg-background-surface rounded">↑↓</kbd> navigate</span>
          <span><kbd className="px-1.5 py-0.5 bg-background-surface rounded">↵</kbd> select</span>
          <span><kbd className="px-1.5 py-0.5 bg-background-surface rounded">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
