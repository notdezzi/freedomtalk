'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Link as LinkIcon, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useServerStore, Server } from '@/stores/serverStore';

export default function JoinServerModal() {
  const router = useRouter();
  const { activeModal, closeModal } = useUIStore();
  const { addServer, setCurrentServer } = useServerStore();

  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewServer, setPreviewServer] = useState<Server | null>(null);

  const isOpen = activeModal.type === 'join-server';

  const handleClose = () => {
    closeModal();
    setInviteCode('');
    setError('');
    setPreviewServer(null);
  };

  const handlePreview = async () => {
    setError('');

    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock server preview
    const mockServer: Server = {
      id: Date.now().toString(),
      name: 'Cool Server',
      description: 'A cool community for cool people',
      ownerId: '0',
      memberCount: 1234,
      onlineCount: 567,
      createdAt: new Date().toISOString(),
      isOwner: false,
    };

    setPreviewServer(mockServer);
    setIsLoading(false);
  };

  const handleJoin = async () => {
    if (!previewServer) return;

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    addServer(previewServer);
    setCurrentServer(previewServer.id);
    handleClose();
    router.push(`/app/servers/${previewServer.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="card max-w-md w-full animate-fade-in"
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
                  setPreviewServer(null);
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {error}
            </div>
          )}

          {/* Server preview */}
          {previewServer && (
            <div className="card bg-background-surface">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
                  <span className="text-lg font-bold text-background">
                    {previewServer.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{previewServer.name}</h3>
                  <p className="text-sm text-foreground-muted">
                    {previewServer.memberCount.toLocaleString()} members •{' '}
                    {previewServer.onlineCount.toLocaleString()} online
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!previewServer ? (
            <>
              <button onClick={handleClose} className="btn btn-ghost flex-1" disabled={isLoading}>
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={isLoading}
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
                onClick={() => setPreviewServer(null)}
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

        {/* Examples */}
        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-xs text-foreground-subtle mb-2">Examples:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['freedomtalk', 'gaming', 'dev-community'].map((code) => (
              <button
                key={code}
                onClick={() => setInviteCode(code)}
                className="px-2 py-1 rounded text-xs bg-background-surface hover:bg-accent-muted hover:text-accent transition-colors"
              >
                {code}
              </button>
            ))}
          </div>
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
