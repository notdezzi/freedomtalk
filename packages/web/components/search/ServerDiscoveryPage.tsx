'use client';

import { useState, useEffect } from 'react';
import { Search, Users, Globe, Lock, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

interface DiscoverServer {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  banner?: string;
  memberCount: number;
  onlineCount: number;
  isPublic: boolean;
  tags?: string[];
}

const categories = [
  { id: 'all', name: 'All' },
  { id: 'gaming', name: 'Gaming' },
  { id: 'music', name: 'Music' },
  { id: 'education', name: 'Education' },
  { id: 'science', name: 'Science & Tech' },
  { id: 'entertainment', name: 'Entertainment' },
];

export default function ServerDiscoveryPage() {
  const router = useRouter();
  const [servers, setServers] = useState<DiscoverServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadServers();
  }, [selectedCategory]);

  const loadServers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.discoverServers({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        query: searchQuery || undefined,
      });

      if (response.success && response.data) {
        const data = response.data as { servers?: unknown[] };
        setServers((data.servers || []) as DiscoverServer[]);
      }
    } catch (err) {
      console.error('Failed to load servers:', err);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadServers();
  };

  const handleJoinServer = async (serverId: string) => {
    try {
      const response = await apiClient.joinServer(serverId);
      if (response.success) {
        router.push(`/app/servers/${serverId}`);
      }
    } catch (err) {
      console.error('Failed to join server:', err);
    }
  };

  const filteredServers = searchQuery
    ? servers.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : servers;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-accent/20 to-background py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Discover Servers</h1>
          <p className="text-foreground-muted mb-6">
            Find communities that match your interests
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Explore servers"
              className="w-full pl-12 pr-4 py-3 bg-background-elevated rounded-lg border border-border focus:border-accent focus:outline-none"
            />
          </form>
        </div>
      </div>

      {/* Categories */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-2 py-4 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-accent text-background'
                    : 'bg-background-surface text-foreground-muted hover:text-foreground'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Servers Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : filteredServers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground-muted">No servers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServers.map((server) => (
              <div
                key={server.id}
                className="bg-background-elevated rounded-lg border border-border overflow-hidden hover:border-accent/50 transition-colors"
              >
                {/* Banner */}
                <div className="h-24 bg-gradient-to-r from-accent to-secondary relative">
                  {server.banner && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={server.banner}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Icon */}
                <div className="px-4 -mt-8 relative z-10">
                  <div className="w-16 h-16 rounded-lg bg-accent border-4 border-background-elevated flex items-center justify-center overflow-hidden">
                    {server.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={server.icon} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-background">
                        {server.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{server.name}</h3>
                    {server.isPublic ? (
                      <span title="Public"><Globe className="w-4 h-4 text-success" /></span>
                    ) : (
                      <span title="Private"><Lock className="w-4 h-4 text-foreground-muted" /></span>
                    )}
                  </div>

                  {server.description && (
                    <p className="text-sm text-foreground-muted mb-3 line-clamp-2">
                      {server.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-foreground-muted mb-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {server.memberCount.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      {server.onlineCount.toLocaleString()} online
                    </span>
                  </div>

                  {/* Tags */}
                  {server.tags && server.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {server.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-background-surface rounded text-xs text-foreground-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Join Button */}
                  <button
                    onClick={() => handleJoinServer(server.id)}
                    className="w-full py-2 bg-accent text-background rounded font-medium hover:bg-accent-hover transition-colors"
                  >
                    Join Server
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
