'use client';

import { useState, useCallback } from 'react';
import { Button, Input, Modal } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { BanList } from '../ban-manager';
import { useServerBans, useUnbanMember, useBanMember, BanResponse } from '@/features/servers';
import { useCan } from '@/hooks';
import { PERMISSION_FLAGS } from '@freedomtalk/shared';
import { toast } from '@/stores/toast-store';
import { UserPlus, Search, ShieldAlert, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface BansTabProps {
  serverId: string;
}

/**
 * Ban User Modal - Search for a user and ban them
 */
function BanUserModal({
  open,
  onClose,
  onBan,
}: {
  open: boolean;
  onClose: () => void;
  onBan: (userId: string, reason: string, deleteMessageDays: number) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [deleteMessageDays, setDeleteMessageDays] = useState(0);
  const [isBanning, setIsBanning] = useState(false);

  // Search for users
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiClient.searchUsers(query);
      if (response.success && response.data?.users) {
        setSearchResults(response.data.users);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectUser = (user: typeof selectedUser) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleBan = () => {
    if (!selectedUser) return;
    setIsBanning(true);
    onBan(selectedUser.id, reason, deleteMessageDays);
    // Reset and close after ban
    setTimeout(() => {
      setIsBanning(false);
      setSelectedUser(null);
      setReason('');
      setDeleteMessageDays(0);
      onClose();
    }, 500);
  };

  const handleClose = () => {
    setSelectedUser(null);
    setReason('');
    setDeleteMessageDays(0);
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Ban User" size="md">
      <div className="p-6 space-y-6">
        {!selectedUser ? (
          <>
            {/* User search */}
            <div>
              <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
                Select User to Ban
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
                <Input
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Search results */}
            {isSearching && (
              <div className="text-sm text-foreground-muted text-center py-4">
                Searching...
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-background-surface transition-colors text-left"
                  >
                    <Avatar
                      src={user.avatar}
                      alt={user.displayName || user.username}
                      size="md"
                    />
                    <div>
                      <div className="font-medium text-foreground">
                        {user.displayName || user.username}
                      </div>
                      <div className="text-sm text-foreground-muted">
                        @{user.username}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!isSearching && searchQuery && searchResults.length === 0 && (
              <div className="text-sm text-foreground-muted text-center py-4">
                No users found
              </div>
            )}
          </>
        ) : (
          <>
            {/* Selected user */}
            <div className="flex items-center gap-3 p-3 bg-background-surface rounded-lg">
              <Avatar
                src={selectedUser.avatar}
                alt={selectedUser.displayName || selectedUser.username}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {selectedUser.displayName || selectedUser.username}
                </div>
                <div className="text-sm text-foreground-muted">
                  @{selectedUser.username}
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-foreground-muted hover:text-foreground"
              >
                Change
              </button>
            </div>

            {/* Ban reason */}
            <div>
              <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
                Reason (Optional)
              </label>
              <textarea
                placeholder="Enter a reason for this ban..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-24 px-3 py-2 bg-background-surface border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

            {/* Delete message history option */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="deleteMessages"
                checked={deleteMessageDays > 0}
                onChange={(e) => setDeleteMessageDays(e.target.checked ? 1 : 0)}
                className="h-4 w-4 rounded border-border bg-background-surface accent-accent"
              />
              <label htmlFor="deleteMessages" className="text-sm text-foreground-muted">
                Delete message history from the last 24 hours
              </label>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground-muted">
                <span className="font-medium text-warning">Warning:</span> Banning this user will remove them from the server permanently. They will not be able to rejoin unless manually unbanned.
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleBan}
                loading={isBanning}
              >
                <ShieldAlert className="h-4 w-4 mr-1.5" />
                Ban User
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/**
 * Confirmation Modal for Unban
 */
function UnbanConfirmModal({
  open,
  onClose,
  ban,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  ban: BanResponse | null;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!ban) return null;

  const username = ban.user?.username || 'Deleted User';

  return (
    <Modal open={open} onClose={onClose} title="Unban User" size="sm">
      <div className="p-6 space-y-4">
        <p className="text-foreground">
          Are you sure you want to unban <span className="font-semibold">{username}</span>?
        </p>
        <p className="text-sm text-foreground-muted">
          They will be able to rejoin the server if they have an invite.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={isLoading}>
            Unban
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function BansTab({ serverId }: BansTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [unbanTarget, setUnbanTarget] = useState<BanResponse | null>(null);

  // Queries
  const { data: bans = [], isLoading: isLoadingBans, refetch } = useServerBans(serverId);

  // Mutations
  const unbanMember = useUnbanMember(serverId);
  const banMember = useBanMember(serverId);

  // Permission checks
  const canBan = useCan(serverId, PERMISSION_FLAGS.BAN_MEMBERS);

  // Handle unban
  const handleUnban = useCallback((ban: BanResponse) => {
    setUnbanTarget(ban);
  }, []);

  const confirmUnban = useCallback(() => {
    if (!unbanTarget) return;

    unbanMember.mutate(unbanTarget.userId, {
      onSuccess: () => {
        toast.success(`${unbanTarget.user?.username || 'User'} has been unbanned`);
        setUnbanTarget(null);
        refetch();
      },
      onError: (error) => {
        toast.error('Failed to unban user. You may not have permission.');
        console.error('Unban error:', error);
      },
    });
  }, [unbanTarget, unbanMember, refetch]);

  // Handle ban
  const handleBan = useCallback((userId: string, reason: string, _deleteMessageDays?: number) => {
    // Note: deleteMessageDays is not currently supported by the API but kept for future use
    void _deleteMessageDays;
    banMember.mutate(
      { userId, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success('User has been banned');
          refetch();
        },
        onError: (error) => {
          toast.error('Failed to ban user. You may not have permission.');
          console.error('Ban error:', error);
        },
      }
    );
  }, [banMember, refetch]);

  // If user doesn't have ban permission, don't show this tab
  if (!canBan) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="h-16 w-16 rounded-full bg-background-surface flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8 text-foreground-subtle" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Access</h3>
        <p className="text-sm text-foreground-muted max-w-xs">
          You need the Ban Members permission to view and manage server bans.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">Bans</h3>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowBanModal(true)}
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Ban User
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
          <Input
            placeholder="Search banned users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Ban count */}
      <div className="flex items-center gap-2 mb-3 text-sm text-foreground-muted">
        <ShieldAlert className="h-4 w-4" />
        <span>
          {bans.length} {bans.length === 1 ? 'ban' : 'bans'}
        </span>
      </div>

      {/* Ban list */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-background-elevated/50">
        <BanList
          bans={bans}
          isLoading={isLoadingBans}
          onUnban={handleUnban}
          searchQuery={searchQuery}
        />
      </div>

      {/* Tip */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-foreground-subtle">
          <span className="font-medium text-foreground-muted">Tip:</span> Banned users cannot rejoin the server unless unbanned. They will be removed from the server immediately upon being banned.
        </p>
      </div>

      {/* Ban User Modal */}
      <BanUserModal
        open={showBanModal}
        onClose={() => setShowBanModal(false)}
        onBan={handleBan}
      />

      {/* Unban Confirm Modal */}
      <UnbanConfirmModal
        open={!!unbanTarget}
        onClose={() => setUnbanTarget(null)}
        ban={unbanTarget}
        onConfirm={confirmUnban}
        isLoading={unbanMember.isPending}
      />
    </div>
  );
}
