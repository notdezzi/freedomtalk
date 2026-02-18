'use client';

import { useState, useEffect } from 'react';
import { Ban, Loader2, Search, UserX, MoreHorizontal } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface BannedUser {
  userId: string;
  username: string;
  avatar?: string;
  reason?: string;
  bannedAt: string;
  bannedBy: string;
  bannedByUsername?: string;
}

interface ServerBansTabProps {
  serverId: string;
}

export default function ServerBansTab({ serverId }: ServerBansTabProps) {
  const [bans, setBans] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unbanning, setUnbanning] = useState<string | null>(null);

  useEffect(() => {
    fetchBans();
  }, [serverId]);

  const fetchBans = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getBans(serverId);
      if (response.success && response.data) {
        // Map API response to include username (API may only return userId)
        const bansData = (response.data.bans || []).map((ban: { userId: string; reason?: string; bannedAt: string; bannedBy: string }) => ({
          ...ban,
          username: `User ${ban.userId.slice(0, 8)}`, // Fallback username from userId
        }));
        setBans(bansData);
      }
    } catch {
      // Empty on error
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (userId: string) => {
    if (!confirm('Are you sure you want to unban this user?')) return;

    setUnbanning(userId);
    try {
      const response = await apiClient.unbanMember(serverId, userId);
      if (response.success) {
        setBans(bans.filter((b) => b.userId !== userId));
      }
    } catch {
      // Handle error silently
    } finally {
      setUnbanning(null);
    }
  };

  const filteredBans = searchQuery
    ? bans.filter(
        (b) =>
          b.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.reason?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : bans;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h4 className="font-medium">Ban Management</h4>
        <p className="text-sm text-foreground-muted">
          Manage banned users on this server
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <input
          type="text"
          placeholder="Search bans..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-10 w-full max-w-md"
        />
      </div>

      {/* Bans list */}
      {filteredBans.length === 0 ? (
        <div className="text-center py-12 text-foreground-muted">
          <Ban className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No banned users</p>
          <p className="text-xs mt-1">
            {searchQuery ? 'Try a different search' : 'Banned users will appear here'}
          </p>
        </div>
      ) : (
        <div className="bg-background-surface rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr,1fr,auto] gap-4 px-4 py-3 bg-background-elevated text-xs font-medium text-foreground-muted uppercase">
            <span>User</span>
            <span>Reason</span>
            <span className="w-24 text-right">Actions</span>
          </div>

          {/* List */}
          <div className="divide-y divide-border">
            {filteredBans.map((ban) => (
              <div
                key={ban.userId}
                className="grid grid-cols-[1fr,1fr,auto] gap-4 px-4 py-3 hover:bg-background/50 transition-colors"
              >
                {/* User */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-error-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {ban.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ban.avatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-error">
                        {ban.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{ban.username}</p>
                    <p className="text-xs text-foreground-muted">
                      Banned {formatDate(ban.bannedAt)}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <div className="flex items-center min-w-0">
                  <p className="text-sm text-foreground-muted truncate">
                    {ban.reason || 'No reason provided'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleUnban(ban.userId)}
                    disabled={unbanning === ban.userId}
                    className="btn btn-ghost text-xs py-1 px-2 hover:bg-accent-muted hover:text-accent"
                  >
                    {unbanning === ban.userId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserX className="w-4 h-4 mr-1" />
                        Unban
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="p-4 rounded-lg bg-background-surface">
        <p className="text-sm text-foreground-muted">
          Total banned users: <span className="font-medium text-foreground">{bans.length}</span>
        </p>
      </div>
    </div>
  );
}
