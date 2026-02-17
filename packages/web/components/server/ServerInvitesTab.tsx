'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Check, Loader2, Clock, Users, Infinity } from 'lucide-react';
import { apiClient, InviteResponse } from '@/lib/api-client';

interface ServerInvitesTabProps {
  serverId: string;
}

export default function ServerInvitesTab({ serverId }: ServerInvitesTabProps) {
  const [invites, setInvites] = useState<InviteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New invite options
  const [maxUses, setMaxUses] = useState(0);
  const [maxAge, setMaxAge] = useState(86400); // 24 hours

  const maxAgeOptions = [
    { label: '30 minutes', value: 1800 },
    { label: '1 hour', value: 3600 },
    { label: '6 hours', value: 21600 },
    { label: '12 hours', value: 43200 },
    { label: '24 hours', value: 86400 },
    { label: '7 days', value: 604800 },
    { label: 'Never', value: 0 },
  ];

  const maxUsesOptions = [
    { label: 'No limit', value: 0 },
    { label: '1 use', value: 1 },
    { label: '5 uses', value: 5 },
    { label: '10 uses', value: 10 },
    { label: '25 uses', value: 25 },
    { label: '50 uses', value: 50 },
    { label: '100 uses', value: 100 },
  ];

  useEffect(() => {
    loadInvites();
  }, [serverId]);

  const loadInvites = async () => {
    setLoading(true);
    const response = await apiClient.getInvites(serverId);
    if (response.success && response.data) {
      const invitesArray = Array.isArray(response.data)
        ? response.data
        : (response.data as { invites?: InviteResponse[] }).invites || [];
      setInvites(invitesArray);
    }
    setLoading(false);
  };

  const createInvite = async () => {
    setSaving(true);
    const response = await apiClient.createInvite(serverId, {
      maxUses,
      expiresAt: maxAge ? new Date(Date.now() + maxAge * 1000).toISOString() : undefined,
    });

    if (response.success && response.data) {
      setInvites((prev) => [response.data as InviteResponse, ...prev]);
      setCreating(false);
      // Auto-copy the new invite
      copyInvite(response.data as InviteResponse);
    }

    setSaving(false);
  };

  const deleteInvite = async (code: string) => {
    const response = await apiClient.deleteInvite(serverId, code);
    if (response.success) {
      setInvites((prev) => prev.filter((i) => i.code !== code));
    }
  };

  const copyInvite = async (invite: InviteResponse) => {
    const url = `${window.location.origin}/invite/${invite.code}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatExpiry = (expiresAt?: string) => {
    if (!expiresAt) return 'Never';
    const date = new Date(expiresAt);
    if (date < new Date()) return 'Expired';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const isExpired = (invite: InviteResponse) => {
    if (!invite.expiresAt) return false;
    return new Date(invite.expiresAt) < new Date();
  };

  const isExhausted = (invite: InviteResponse) => {
    return invite.maxUses > 0 && invite.uses >= invite.maxUses;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Server Invites</h4>
          <p className="text-sm text-foreground-muted mt-1">
            Create and manage invite links for this server
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="px-3 py-1.5 bg-accent text-background rounded text-sm font-medium hover:bg-accent-hover transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Create Invite
          </button>
        )}
      </div>

      {/* Create Invite Form */}
      {creating && (
        <div className="p-4 bg-background-surface rounded-lg border border-border space-y-4">
          <h5 className="font-medium">Create New Invite</h5>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">
                Expires After
              </label>
              <select
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background rounded border border-border focus:border-accent focus:outline-none"
              >
                {maxAgeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">
                Max Uses
              </label>
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background rounded border border-border focus:border-accent focus:outline-none"
              >
                {maxUsesOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setCreating(false)}
              className="px-3 py-1.5 bg-background-surface text-foreground rounded font-medium hover:bg-background-surface/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createInvite}
              disabled={saving}
              className="px-3 py-1.5 bg-accent text-background rounded font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Invites List */}
      <div className="space-y-2">
        {invites.map((invite) => {
          const expired = isExpired(invite);
          const exhausted = isExhausted(invite);
          const disabled = expired || exhausted;

          return (
            <div
              key={invite.id}
              className={`flex items-center gap-4 p-4 bg-background-surface rounded-lg border border-border ${
                disabled ? 'opacity-50' : ''
              }`}
            >
              {/* Code */}
              <div className="flex-1">
                <code className="text-lg font-mono">{invite.code}</code>
                <div className="flex items-center gap-4 mt-1 text-sm text-foreground-muted">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {invite.uses} / {invite.maxUses || '∞'}
                  </span>
                  <span className="flex items-center gap-1">
                    {invite.expiresAt ? (
                      <>
                        <Clock className="w-3 h-3" />
                        {formatExpiry(invite.expiresAt)}
                      </>
                    ) : (
                      <>
                        <Infinity className="w-3 h-3" />
                        Never expires
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Status */}
              {expired && (
                <span className="text-xs px-2 py-1 bg-error/20 text-error rounded">
                  Expired
                </span>
              )}
              {exhausted && (
                <span className="text-xs px-2 py-1 bg-warning/20 text-warning rounded">
                  Used up
                </span>
              )}

              {/* Actions */}
              <div className="flex gap-1">
                <button
                  onClick={() => copyInvite(invite)}
                  className="p-2 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
                  title="Copy link"
                >
                  {copiedId === invite.id ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => deleteInvite(invite.code)}
                  className="p-2 rounded hover:bg-error/10 text-foreground-muted hover:text-error transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {invites.length === 0 && (
          <div className="text-center py-8 text-foreground-muted">
            No invites created yet
          </div>
        )}
      </div>
    </div>
  );
}
