'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Link as LinkIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useServerStore, Server } from '@/stores/serverStore';
import { apiClient } from '@/lib/api-client';

interface InvitePreview {
  invite: { code: string; expiresAt: string | null; maxUses: number | null; uses: number };
  server: { id: string; name: string; icon_url: string | null; member_count: number } | null;
  channel: { id: string; name: string; type: string } | null;
  inviter: { id: string; username: string; avatar: string | null } | null;
}

export default function JoinServerModal() {
  const router = useRouter();
  const { activeModal, closeModal } = useUIStore();
  const { addServer, setCurrentServer } = useServerStore();

  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<InvitePreview | null>(null);

  const isOpen = activeModal.type === 'join-server';

  const handleClose = () => {
    closeModal();
    setInviteCode('');
    setError('');
    setPreview(null);
  };

  // Extract invite code from full URL if pasted
  const extractInviteCode = (input: string): string => {
    // Handle full URL like https://freedomtalk.app/invite/xxxxx
    const inviteMatch = input.match(/invite\/([a-zA-Z0-9]+)/);
    if (inviteMatch) {
      return inviteMatch[1];
    }
    // Handle just the code
    return input.trim();
  };

  const handlePreview = async () => {
    setError('');

    const code = extractInviteCode(inviteCode);
    if (!code) {
      setError('Please enter an invite code');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.previewInvite(code);

      if (!response.success) {
        setError(response.error?.message || 'Invalid invite code');
        setPreview(null);
        return;
      }

      if (!response.data?.server) {
        setError('Server information not available');
        setPreview(null);
        return;
      }

      setPreview(response.data);
    } catch (err) {
      setError('Failed to preview invite. Please check the code and try again.');
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!preview?.server) return;

    setIsLoading(true);

    try {
      const code = extractInviteCode(inviteCode);
      const response = await apiClient.joinServer(code);

      if (!response.success) {
        setError(response.error?.message || 'Failed to join server');
        return;
      }

      // Convert to Server format and add to store
      const serverData = response.data?.server;
      const previewServer = preview.server;
      const server: Server = {
        id: previewServer.id,
        name: previewServer.name,
        description: '',
        icon: previewServer.icon_url || undefined,
        ownerId: '',
        memberCount: previewServer.member_count || 0,
        onlineCount: 0,
        createdAt: new Date().toISOString(),
        isOwner: false,
      };

      addServer(server);
      setCurrentServer(server.id);
      handleClose();
      router.push(`/app/servers/${server.id}`);
    } catch (err) {
      setError('Failed to join server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="card max-w-md w-full animate-fade-in relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Join a server</h2>
          <p className="text-foreground-muted">
            Enter an invite code to join an existing server
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium mb-2">
              Invite Code <span className="text-error">*</span>
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-subtle" />
              <input
                id="inviteCode"
                type="text"
                className="input pl-12"
                placeholder="https://freedomtalk.app/invite/xxxxx"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setPreview(null);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePreview();
                  }
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Server preview */}
          {preview?.server && (
            <div className="card bg-background-surface">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center overflow-hidden">
                  {preview.server.icon_url ? (
                    <img
                      src={preview.server.icon_url}
                      alt={preview.server.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-background">
                      {preview.server.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{preview.server.name}</h3>
                  <p className="text-sm text-foreground-muted">
                    {preview.server.member_count.toLocaleString()} members
                  </p>
                  {preview.channel && (
                    <p className="text-xs text-foreground-subtle">
                      #{preview.channel.name}
                    </p>
                  )}
                </div>
              </div>
              {preview.inviter && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-foreground-subtle">
                    Invited by <span className="text-foreground-muted font-medium">{preview.inviter.username}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!preview ? (
            <>
              <button onClick={handleClose} className="btn btn-ghost flex-1" disabled={isLoading}>
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={isLoading || !inviteCode.trim()}
                className="btn btn-primary flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Preview'
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setPreview(null);
                  setError('');
                }}
                className="btn btn-ghost flex-1"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                onClick={handleJoin}
                disabled={isLoading}
                className="btn btn-primary flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Join Server
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-background-surface transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
