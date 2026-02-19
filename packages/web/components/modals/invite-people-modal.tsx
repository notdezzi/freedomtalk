'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { Copy, Check, RefreshCw, Link as LinkIcon, Trash2, Clock, User, Hash } from 'lucide-react';
import { useServerInvites, useDeleteInvite } from '@/features/servers';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils';

interface InviteData {
  id: string;
  code: string;
  server_id?: string;
  channelId?: string;
  inviter_id?: string;
  max_uses?: number | null;
  uses?: number;
  expires_at?: string | null;
  created_at?: string;
  inviter?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

interface InvitePeopleModalProps {
  serverId: string;
  onClose: () => void;
}

export function InvitePeopleModal({ serverId, onClose }: InvitePeopleModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Get all invites
  const { data: invites = [], isLoading, refetch, error: queryError } = useServerInvites(serverId);
  const deleteInvite = useDeleteInvite(serverId);

  // Create new invite
  const createInvite = useMutation({
    mutationFn: async (): Promise<InviteData> => {
      if (!serverId) {
        throw new Error('Server ID is required');
      }

      const response = await apiClient.createInvite(serverId, {
        maxUses: 0,  // Unlimited uses
        maxAge: 0,   // Never expires
      });

      if (!response.success) {
        const errorMsg = response.error?.message || 'Failed to create invite';
        throw new Error(errorMsg);
      }

      return response.data as InviteData;
    },
    onSuccess: () => {
      toast.success('Invite link created');
      refetch();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create invite');
    },
  });

  const handleCopy = async (code: string) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateInvite = () => {
    createInvite.mutate();
  };

  const handleDeleteInvite = (inviteId: string, code: string) => {
    if (deleteConfirm === inviteId) {
      deleteInvite.mutate(inviteId, {
        onSuccess: () => {
          toast.success('Invite deleted');
          setDeleteConfirm(null);
        },
        onError: () => {
          toast.error('Failed to delete invite');
        },
      });
    } else {
      setDeleteConfirm(inviteId);
      // Reset confirm after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const formatExpiry = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return 'Never expires';
    const expiry = new Date(expiresAt);
    const now = new Date();
    if (expiry < now) return 'Expired';
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Expires in 1 day';
    if (diffDays < 7) return `Expires in ${diffDays} days`;
    return `Expires ${expiry.toLocaleDateString()}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  // Don't render if serverId is not provided
  if (!serverId) {
    return (
      <Modal open onClose={onClose} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Error</h2>
          <p className="text-red-400 mb-4">Unable to manage invites: Server ID is missing.</p>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="secondary">Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} className="max-w-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-indigo-400" />
            <h2 className="text-xl font-semibold text-white">Invite People</h2>
          </div>
          <Button
            onClick={handleCreateInvite}
            variant="primary"
            size="sm"
            disabled={createInvite.isPending}
          >
            {createInvite.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              'Create New'
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading invites...</span>
          </div>
        ) : queryError ? (
          <div className="text-center py-8">
            <p className="text-red-400">Failed to load invites</p>
            <Button onClick={() => refetch()} variant="secondary" className="mt-2">
              Retry
            </Button>
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <LinkIcon className="h-8 w-8 text-gray-500" />
            </div>
            <p className="text-gray-400 mb-2">No invite links available</p>
            <p className="text-gray-500 text-sm mb-4">Create an invite link to share with others</p>
            <Button onClick={handleCreateInvite} variant="primary" disabled={createInvite.isPending}>
              {createInvite.isPending ? 'Creating...' : 'Create Invite Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <code className="text-indigo-400 font-mono text-sm">{invite.code}</code>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(invite.code)}
                      className="p-1.5 rounded hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                      title="Copy invite link"
                    >
                      {copiedCode === invite.code ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteInvite(invite.id, invite.code)}
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        deleteConfirm === invite.id
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "hover:bg-gray-600 text-gray-400 hover:text-red-400"
                      )}
                      title={deleteConfirm === invite.id ? "Click again to confirm" : "Delete invite"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{invite.uses || 0}/{invite.max_uses === 0 || !invite.max_uses ? '∞' : invite.max_uses} uses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatExpiry(invite.expires_at)}</span>
                  </div>
                </div>
                {invite.created_at && (
                  <div className="text-xs text-gray-600 mt-1">
                    Created {formatDate(invite.created_at)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="secondary">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
