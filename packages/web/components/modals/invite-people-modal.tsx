'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { Copy, Check, RefreshCw, Link as LinkIcon, Trash2, Clock, User, Hash, Settings, ChevronDown } from 'lucide-react';
import { useServerInvites, useDeleteInvite, useCreateInvite, useUpdateInvite } from '@/features/servers';
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
  max_age?: number | null;
  expires_at?: string | null;
  created_at?: string;
  inviter?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

// Invite options
const MAX_USES_OPTIONS = [
  { label: 'No limit', value: 0 },
  { label: '1 use', value: 1 },
  { label: '5 uses', value: 5 },
  { label: '10 uses', value: 10 },
  { label: '25 uses', value: 25 },
  { label: '50 uses', value: 50 },
  { label: '100 uses', value: 100 },
];

const MAX_AGE_OPTIONS = [
  { label: 'Never', value: 0 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '6 hours', value: 21600 },
  { label: '12 hours', value: 43200 },
  { label: '1 day', value: 86400 },
  { label: '7 days', value: 604800 },
];

interface InvitePeopleModalProps {
  serverId: string;
  onClose: () => void;
}

export function InvitePeopleModal({ serverId, onClose }: InvitePeopleModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingInvite, setEditingInvite] = useState<string | null>(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [newInviteOptions, setNewInviteOptions] = useState({
    maxUses: 0,
    maxAge: 0,
  });
  const [editOptions, setEditOptions] = useState({
    maxUses: 0,
    maxAge: 0,
  });

  // Get all invites
  const { data: invites = [], isLoading, refetch, error: queryError } = useServerInvites(serverId);
  const deleteInvite = useDeleteInvite(serverId);
  const createInvite = useCreateInvite(serverId);
  const updateInvite = useUpdateInvite(serverId);

  const handleCopy = async (code: string) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateInvite = (withOptions?: { maxUses: number; maxAge: number }) => {
    const options = withOptions || newInviteOptions;
    createInvite.mutate({
      maxUses: options.maxUses,
      maxAge: options.maxAge,
    }, {
      onSuccess: () => {
        toast.success('Invite link created');
        setShowCreateOptions(false);
        setNewInviteOptions({ maxUses: 0, maxAge: 0 });
        refetch();
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to create invite');
      },
    });
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
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleEditInvite = (invite: InviteData) => {
    setEditingInvite(invite.code);
    setEditOptions({
      maxUses: invite.max_uses || 0,
      maxAge: invite.max_age || 0,
    });
  };

  const handleSaveEdit = (code: string) => {
    updateInvite.mutate({
      code,
      data: {
        maxUses: editOptions.maxUses === 0 ? null : editOptions.maxUses,
        maxAge: editOptions.maxAge === 0 ? null : editOptions.maxAge,
      },
    }, {
      onSuccess: () => {
        toast.success('Invite updated');
        setEditingInvite(null);
        refetch();
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to update invite');
      },
    });
  };

  const formatExpiry = (expiresAt: string | null | undefined, maxAge: number | null | undefined) => {
    if (!expiresAt && (!maxAge || maxAge === 0)) return 'Never expires';
    if (expiresAt) {
      const expiry = new Date(expiresAt);
      const now = new Date();
      if (expiry < now) return 'Expired';
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) return 'Expires in 1 day';
      if (diffDays < 7) return `Expires in ${diffDays} days`;
      return `Expires ${expiry.toLocaleDateString()}`;
    }
    // Calculate from max_age if no expires_at
    if (maxAge) {
      const maxAgeOption = MAX_AGE_OPTIONS.find(o => o.value === maxAge);
      return maxAgeOption ? `Expires after ${maxAgeOption.label.toLowerCase()}` : 'Expires';
    }
    return 'Never expires';
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
          <h2 className="text-xl font-semibold text-foreground mb-4">Error</h2>
          <p className="text-error mb-4">Unable to manage invites: Server ID is missing.</p>
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
            <h2 className="text-xl font-semibold text-foreground">Invite People</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleCreateInvite()}
              variant="primary"
              size="sm"
              disabled={createInvite.isPending}
            >
              {createInvite.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Quick Create'
              )}
            </Button>
            <Button
              onClick={() => setShowCreateOptions(!showCreateOptions)}
              variant="secondary"
              size="sm"
            >
              Customize
              <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", showCreateOptions && "rotate-180")} />
            </Button>
          </div>
        </div>

        {/* Create invite with options */}
        {showCreateOptions && (
          <div className="mb-4 p-3 bg-background-surface rounded-lg border border-border space-y-3">
            <h4 className="text-sm font-medium text-foreground">Create Custom Invite</h4>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-foreground-muted mb-1 block">Max Uses</label>
                <select
                  value={newInviteOptions.maxUses}
                  onChange={(e) => setNewInviteOptions(prev => ({ ...prev, maxUses: parseInt(e.target.value) }))}
                  className="w-full bg-background text-foreground rounded px-2 py-1.5 border border-border text-sm"
                >
                  {MAX_USES_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-foreground-muted mb-1 block">Expires After</label>
                <select
                  value={newInviteOptions.maxAge}
                  onChange={(e) => setNewInviteOptions(prev => ({ ...prev, maxAge: parseInt(e.target.value) }))}
                  className="w-full bg-background text-foreground rounded px-2 py-1.5 border border-border text-sm"
                >
                  {MAX_AGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              onClick={() => handleCreateInvite(newInviteOptions)}
              variant="primary"
              size="sm"
              disabled={createInvite.isPending}
              className="w-full"
            >
              {createInvite.isPending ? 'Creating...' : 'Create Invite'}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-foreground-muted" />
            <span className="ml-2 text-foreground-muted">Loading invites...</span>
          </div>
        ) : queryError ? (
          <div className="text-center py-8">
            <p className="text-error">Failed to load invites</p>
            <Button onClick={() => refetch()} variant="secondary" className="mt-2">
              Retry
            </Button>
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-background-surface rounded-full flex items-center justify-center mx-auto mb-4">
              <LinkIcon className="h-8 w-8 text-foreground-subtle" />
            </div>
            <p className="text-foreground-muted mb-2">No invite links available</p>
            <p className="text-foreground-subtle text-sm mb-4">Create an invite link to share with others</p>
            <Button onClick={() => handleCreateInvite()} variant="primary" disabled={createInvite.isPending}>
              {createInvite.isPending ? 'Creating...' : 'Create Invite Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="bg-background-surface/50 rounded-lg p-3 hover:bg-background-surface transition-colors"
              >
                {editingInvite === invite.code ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-foreground-subtle" />
                      <code className="text-indigo-400 font-mono text-sm">{invite.code}</code>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-foreground-muted mb-1 block">Max Uses</label>
                        <select
                          value={editOptions.maxUses}
                          onChange={(e) => setEditOptions(prev => ({ ...prev, maxUses: parseInt(e.target.value) }))}
                          className="w-full bg-background text-foreground rounded px-2 py-1 border border-border text-sm"
                        >
                          {MAX_USES_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-foreground-muted mb-1 block">Expires After</label>
                        <select
                          value={editOptions.maxAge}
                          onChange={(e) => setEditOptions(prev => ({ ...prev, maxAge: parseInt(e.target.value) }))}
                          className="w-full bg-background text-foreground rounded px-2 py-1 border border-border text-sm"
                        >
                          {MAX_AGE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingInvite(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSaveEdit(invite.code)}
                        disabled={updateInvite.isPending}
                      >
                        {updateInvite.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-foreground-subtle" />
                        <code className="text-indigo-400 font-mono text-sm">{invite.code}</code>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(invite.code)}
                          className="p-1.5 rounded hover:bg-background-surface/80 text-foreground-muted hover:text-foreground transition-colors"
                          title="Copy invite link"
                        >
                          {copiedCode === invite.code ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditInvite(invite)}
                          className="p-1.5 rounded hover:bg-background-surface/80 text-foreground-muted hover:text-foreground transition-colors"
                          title="Edit invite"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvite(invite.id, invite.code)}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            deleteConfirm === invite.id
                              ? "bg-error/20 text-error hover:bg-error/30"
                              : "hover:bg-background-surface/80 text-foreground-muted hover:text-error"
                          )}
                          title={deleteConfirm === invite.id ? "Click again to confirm" : "Delete invite"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-foreground-subtle">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{invite.uses || 0}/{invite.max_uses === 0 || !invite.max_uses ? '∞' : invite.max_uses} uses</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatExpiry(invite.expires_at, invite.max_age)}</span>
                      </div>
                    </div>
                    {invite.created_at && (
                      <div className="text-xs text-foreground-subtle mt-1">
                        Created {formatDate(invite.created_at)}
                      </div>
                    )}
                  </>
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
