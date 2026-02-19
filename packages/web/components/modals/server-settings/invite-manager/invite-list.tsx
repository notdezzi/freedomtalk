'use client';

import { useState, useCallback } from 'react';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Copy, Check, Trash2, Clock, User, Infinity, Link as LinkIcon } from 'lucide-react';
import { toast } from '@/stores/toast-store';

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

interface InviteListProps {
  invites: InviteData[];
  onDeleteInvite: (inviteId: string) => void;
  canManageServer: boolean;
  isLoading?: boolean;
  isDeleting?: boolean;
}

export function InviteList({
  invites,
  onDeleteInvite,
  canManageServer,
  isLoading,
  isDeleting,
}: InviteListProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCopy = useCallback(async (code: string) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(code);
    toast.success('Invite link copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const handleDeleteClick = useCallback((invite: InviteData) => {
    if (deleteConfirm === invite.id) {
      // Confirmed - proceed with delete
      onDeleteInvite(invite.id);
      setDeleteConfirm(null);
    } else {
      // First click - require confirmation
      setDeleteConfirm(invite.id);
      // Reset confirm after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  }, [deleteConfirm, onDeleteInvite]);

  const formatExpiry = useCallback((expiresAt: string | null | undefined): { text: string; isExpired: boolean } => {
    if (!expiresAt) {
      return { text: 'Never', isExpired: false };
    }
    const expiry = new Date(expiresAt);
    const now = new Date();
    if (expiry < now) {
      return { text: 'Expired', isExpired: true };
    }
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return { text: `${diffMins}m`, isExpired: false };
    }
    if (diffHours < 24) {
      return { text: `${diffHours}h`, isExpired: false };
    }
    if (diffDays <= 7) {
      return { text: `${diffDays}d`, isExpired: false };
    }
    return { text: expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isExpired: false };
  }, []);

  const formatUses = useCallback((uses: number | undefined, maxUses: number | null | undefined): string => {
    const currentUses = uses ?? 0;
    if (!maxUses || maxUses === 0) {
      return currentUses === 0 ? '0' : `${currentUses}`;
    }
    return `${currentUses}/${maxUses}`;
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-foreground-subtle">
        <div className="w-16 h-16 bg-background-surface rounded-full flex items-center justify-center mb-4">
          <LinkIcon className="h-8 w-8 text-foreground-subtle opacity-50" />
        </div>
        <p className="text-sm font-medium mb-1">No invite links</p>
        <p className="text-xs text-foreground-subtle">
          Create an invite link to share with others
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-2 px-3 py-2 text-xs font-semibold text-foreground-muted uppercase border-b border-border">
        <span>Code</span>
        <span>Created By</span>
        <span>Uses</span>
        <span>Expires</span>
        <span className="w-10"></span>
      </div>

      {/* Invite rows */}
      <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-background-surface">
        {invites.map((invite) => {
          const expiryInfo = formatExpiry(invite.expires_at);

          return (
            <div
              key={invite.id}
              className={cn(
                "grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-2 px-3 py-3 items-center hover:bg-background-surface/50 transition-colors border-b border-border last:border-b-0",
                expiryInfo.isExpired && "opacity-50"
              )}
            >
              {/* Code */}
              <div className="flex items-center gap-2">
                <code className="text-indigo-400 font-mono text-sm">{invite.code}</code>
                <button
                  onClick={() => handleCopy(invite.code)}
                  className="p-1 rounded hover:bg-background-hover text-foreground-muted hover:text-foreground transition-colors"
                  title="Copy invite link"
                >
                  {copiedCode === invite.code ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Created By */}
              <div className="flex items-center gap-2 min-w-0">
                {invite.inviter ? (
                  <>
                    <Avatar
                      src={invite.inviter.avatar}
                      alt={invite.inviter.username}
                      size="sm"
                    />
                    <span className="text-sm text-foreground truncate">
                      {invite.inviter.username}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-foreground-muted">Unknown</span>
                )}
              </div>

              {/* Uses */}
              <div className="flex items-center gap-1 text-sm text-foreground-muted">
                <User className="h-3 w-3 flex-shrink-0" />
                <span>
                  {formatUses(invite.uses, invite.max_uses)}
                  {(!invite.max_uses || invite.max_uses === 0) && invite.uses !== undefined && (
                    <Infinity className="h-3 w-3 inline ml-0.5" />
                  )}
                </span>
              </div>

              {/* Expires */}
              <div className={cn(
                "flex items-center gap-1 text-sm",
                expiryInfo.isExpired ? "text-error" : "text-foreground-muted"
              )}>
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>{expiryInfo.text}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end">
                {canManageServer && (
                  <button
                    onClick={() => handleDeleteClick(invite)}
                    disabled={isDeleting}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      deleteConfirm === invite.id
                        ? "bg-error/20 text-error hover:bg-error/30"
                        : "hover:bg-background-hover text-foreground-muted hover:text-error"
                    )}
                    title={deleteConfirm === invite.id ? "Click again to confirm" : "Delete invite"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
