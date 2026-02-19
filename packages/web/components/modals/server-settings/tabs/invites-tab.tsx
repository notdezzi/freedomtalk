'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui';
import { useServerInvites, useCreateInvite, useDeleteInvite } from '@/features/servers';
import { useCan } from '@/hooks';
import { PERMISSION_FLAGS } from '@freedomtalk/shared';
import { toast } from '@/stores/toast-store';
import { Plus, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { InviteList } from '../invite-manager/invite-list';

interface InvitesTabProps {
  serverId: string;
}

export function InvitesTab({ serverId }: InvitesTabProps) {
  const [showExpired, setShowExpired] = useState(false);

  // Queries
  const { data: invites = [], isLoading, refetch, error } = useServerInvites(serverId);

  // Mutations
  const createInvite = useCreateInvite(serverId);
  const deleteInvite = useDeleteInvite(serverId);

  // Permission checks
  const canCreateInvite = useCan(serverId, PERMISSION_FLAGS.CREATE_INVITE);
  const canManageServer = useCan(serverId, PERMISSION_FLAGS.MANAGE_SERVER);

  // Handle creating a new invite
  const handleCreateInvite = useCallback(() => {
    createInvite.mutate(
      {
        maxUses: 0, // Unlimited uses
        maxAge: 0,  // Never expires
      },
      {
        onSuccess: (data) => {
          if (data?.code) {
            const inviteUrl = `${window.location.origin}/invite/${data.code}`;
            navigator.clipboard.writeText(inviteUrl);
            toast.success('Invite link created and copied to clipboard');
          } else {
            toast.success('Invite link created');
          }
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Failed to create invite');
        },
      }
    );
  }, [createInvite]);

  // Handle deleting an invite
  const handleDeleteInvite = useCallback((inviteId: string) => {
    deleteInvite.mutate(inviteId, {
      onSuccess: () => {
        toast.success('Invite deleted');
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to delete invite');
      },
    });
  }, [deleteInvite]);

  // Filter invites based on showExpired setting
  const filteredInvites = showExpired
    ? invites
    : invites.filter((invite: { expires_at?: string | null }) => {
        if (!invite.expires_at) return true;
        return new Date(invite.expires_at) > new Date();
      });

  // Get the most recent invite code for display
  const latestInvite = invites[0];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">Invites</h3>
        {canCreateInvite && (
          <Button
            onClick={handleCreateInvite}
            variant="primary"
            size="sm"
            disabled={createInvite.isPending}
          >
            {createInvite.isPending ? (
              <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1.5" />
            )}
            Create Invite
          </Button>
        )}
      </div>

      {/* Quick invite link display */}
      {latestInvite && (
        <div className="mb-6 p-4 bg-background-surface rounded-lg border border-border">
          <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
            Instant Invite
          </label>
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-indigo-400 flex-shrink-0" />
            <code className="text-sm text-foreground-muted truncate flex-1">
              {window.location.origin}/invite/{latestInvite.code}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const inviteUrl = `${window.location.origin}/invite/${latestInvite.code}`;
                await navigator.clipboard.writeText(inviteUrl);
                toast.success('Invite link copied');
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      )}

      {/* Filter controls */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-muted">Invites:</span>
          <span className="text-sm font-medium text-foreground">{invites.length}</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showExpired}
            onChange={(e) => setShowExpired(e.target.checked)}
            className="rounded border-border bg-background-surface text-accent focus:ring-accent"
          />
          <span className="text-sm text-foreground-muted">Show expired</span>
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="ml-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Invite list */}
      <div className="flex-1">
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-foreground-subtle">
            <p className="text-error mb-2">Failed to load invites</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <InviteList
            invites={filteredInvites}
            onDeleteInvite={handleDeleteInvite}
            canManageServer={canManageServer}
            isLoading={isLoading}
            isDeleting={deleteInvite.isPending}
          />
        )}
      </div>
    </div>
  );
}
