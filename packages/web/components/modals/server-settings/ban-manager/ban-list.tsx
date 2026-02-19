'use client';

import { useState, useCallback } from 'react';
import { Avatar, Button } from '@/components/ui';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { BanResponse } from '@/features/servers';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface BanListProps {
  bans: BanResponse[];
  isLoading?: boolean;
  onUnban: (ban: BanResponse) => void;
  searchQuery?: string;
}

/**
 * Individual ban item component
 */
function BanItem({
  ban,
  onUnban,
  isUnbanning,
}: {
  ban: BanResponse;
  onUnban: () => void;
  isUnbanning: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const username = ban.user?.username || 'Deleted User';
  const avatar = ban.user?.avatar;
  const bannedByName = ban.bannedByName || 'Unknown';
  const bannedAt = ban.bannedAt;

  const handleUnbanClick = () => {
    if (showConfirm) {
      onUnban();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <div className="group flex items-start gap-3 p-3 rounded-lg hover:bg-background-surface transition-colors">
      {/* User avatar */}
      <Avatar
        src={avatar ?? undefined}
        alt={username}
        size="lg"
        className="flex-shrink-0"
      />

      {/* Ban details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            {username}
          </span>
          {!ban.user && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-background-elevated text-foreground-muted">
              Deleted
            </span>
          )}
        </div>

        {/* Ban reason */}
        <p className="text-sm text-foreground-muted mt-0.5">
          <span className="text-foreground-subtle">Reason:</span>{' '}
          {ban.reason || <span className="italic text-foreground-subtle">No reason provided</span>}
        </p>

        {/* Banned by and date */}
        <div className="flex items-center gap-2 mt-1 text-xs text-foreground-subtle">
          <span>
            Banned by <span className="text-foreground-muted">{bannedByName}</span>
          </span>
          <span className="text-border">|</span>
          <span title={formatDate(bannedAt)}>
            {formatRelativeTime(bannedAt)}
          </span>
        </div>
      </div>

      {/* Unban action */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {showConfirm ? (
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={handleUnbanClick}
              disabled={isUnbanning}
              loading={isUnbanning}
            >
              Confirm
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancel}
              disabled={isUnbanning}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUnbanClick}
            disabled={isUnbanning}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Unban
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for ban items
 */
function BanItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg animate-pulse">
      <div className="h-10 w-10 rounded-full bg-background-surface" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-background-surface rounded" />
        <div className="h-3 w-48 bg-background-surface rounded" />
        <div className="h-3 w-24 bg-background-surface rounded" />
      </div>
    </div>
  );
}

/**
 * Empty state for ban list
 */
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-16 w-16 rounded-full bg-background-surface flex items-center justify-center mb-4">
        <ShieldAlert className="h-8 w-8 text-foreground-subtle" />
      </div>
      <p className="text-sm font-medium text-foreground">
        {hasSearch ? 'No bans found' : 'No bans yet'}
      </p>
      <p className="text-xs text-foreground-subtle mt-1 max-w-xs">
        {hasSearch
          ? 'Try a different search term'
          : 'Banned users will appear here. Use the Ban User button to ban someone from the server.'}
      </p>
    </div>
  );
}

export function BanList({ bans, isLoading, onUnban, searchQuery = '' }: BanListProps) {
  // Track which ban is currently being unbanned
  const [unbanningId, setUnbanningId] = useState<string | null>(null);

  // Filter bans by search query
  const filteredBans = bans.filter((ban) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const username = ban.user?.username?.toLowerCase() || '';
    const reason = ban.reason?.toLowerCase() || '';
    return username.includes(query) || reason.includes(query);
  });

  const handleUnban = useCallback(
    (ban: BanResponse) => {
      setUnbanningId(ban.id);
      onUnban(ban);
      // Reset after a delay (in case of error, the parent handles it)
      setTimeout(() => setUnbanningId(null), 3000);
    },
    [onUnban]
  );

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[...Array(3)].map((_, i) => (
          <BanItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (filteredBans.length === 0) {
    return <EmptyState hasSearch={!!searchQuery} />;
  }

  return (
    <div className="space-y-1">
      {filteredBans.map((ban) => (
        <BanItem
          key={ban.id}
          ban={ban}
          onUnban={() => handleUnban(ban)}
          isUnbanning={unbanningId === ban.id}
        />
      ))}
    </div>
  );
}
