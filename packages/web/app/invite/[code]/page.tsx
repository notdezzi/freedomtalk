'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Users, Wifi, Hash, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useServerStore, Server } from '@/stores/serverStore';
import { useUIStore } from '@/stores/uiStore';
import { apiClient } from '@/lib/api-client';

interface InvitePreview {
  invite: {
    code: string;
    expiresAt: string | null;
    maxUses: number | null;
    uses: number;
  };
  server: {
    id: string;
    name: string;
    icon_url: string | null;
    member_count: number;
    online_count: number;
  } | null;
  channel: {
    id: string;
    name: string;
    type: string;
  } | null;
  inviter: {
    id: string;
    username: string;
    avatar: string | null;
  } | null;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { addServer, setCurrentServer, servers } = useServerStore();
  const { openModal } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<InvitePreview | null>(null);

  const code = params.code as string;

  useEffect(() => {
    if (authLoading) return;

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.previewInvite(code);

        if (!response.success) {
          const errorCode = response.error?.code;
          if (errorCode === 'EXPIRED') {
            setError('This invite has expired');
          } else if (errorCode === 'MAX_USES') {
            setError('This invite has reached its maximum uses');
          } else {
            setError(response.error?.message || 'Invalid invite code');
          }
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
        setError('Failed to load invite. Please check the link and try again.');
        setPreview(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [code, authLoading]);

  const handleJoin = async () => {
    if (!user) {
      // Not logged in - redirect to login with return URL
      openModal('login');
      return;
    }

    if (!preview?.server) return;

    // Check if already a member
    const alreadyMember = servers.some(s => s.id === preview.server!.id);
    if (alreadyMember) {
      setCurrentServer(preview.server.id);
      router.push(`/app/servers/${preview.server.id}`);
      return;
    }

    setJoining(true);

    try {
      const response = await apiClient.joinServer(code);

      if (!response.success) {
        setError(response.error?.message || 'Failed to join server');
        return;
      }

      // Add server to store
      const server: Server = {
        id: preview.server.id,
        name: preview.server.name,
        description: '',
        icon: preview.server.icon_url || undefined,
        ownerId: '',
        memberCount: preview.server.member_count || 0,
        onlineCount: preview.server.online_count || 0,
        createdAt: new Date().toISOString(),
        isOwner: false,
      };

      addServer(server);
      setCurrentServer(server.id);
      router.push(`/app/servers/${server.id}`);
    } catch (err) {
      setError('Failed to join server. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleGoHome = () => {
    router.push('/app');
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
          <p className="text-foreground-muted">Loading invite...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !preview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-error" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid Invite</h1>
          <p className="text-foreground-muted mb-6">{error}</p>
          <button onClick={handleGoHome} className="btn btn-primary w-full">
            Go to FreedomTalk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card max-w-lg w-full">
        {/* Server Preview */}
        {preview?.server && (
          <>
            {/* Banner / Icon */}
            <div className="relative -m-6 mb-6 h-32 bg-gradient-to-br from-accent/30 to-secondary/30 rounded-t-xl flex items-center justify-center">
              <div className="w-24 h-24 rounded-2xl bg-background-elevated shadow-xl flex items-center justify-center overflow-hidden border-4 border-background">
                {preview.server.icon_url ? (
                  <img
                    src={preview.server.icon_url}
                    alt={preview.server.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-accent">
                    {preview.server.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Server Info */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">{preview.server.name}</h1>
              <div className="flex items-center justify-center gap-4 text-sm text-foreground-muted">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{preview.server.member_count.toLocaleString()} Members</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-success" />
                  <span>{preview.server.online_count.toLocaleString()} Online</span>
                </div>
              </div>
            </div>

            {/* Channel info */}
            {preview.channel && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background-surface mb-4">
                <Hash className="w-4 h-4 text-foreground-muted" />
                <span className="text-sm text-foreground-muted">
                  You'll be directed to <span className="text-foreground font-medium">{preview.channel.name}</span>
                </span>
              </div>
            )}

            {/* Inviter info */}
            {preview.inviter && (
              <div className="flex items-center gap-2 mb-6 text-sm text-foreground-muted">
                <User className="w-4 h-4" />
                <span>
                  Invited by <span className="text-foreground font-medium">{preview.inviter.username}</span>
                </span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleGoHome}
                className="btn btn-ghost flex-1"
                disabled={joining}
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="btn btn-primary flex-1"
              >
                {joining ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : user ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Join Server
                  </>
                ) : (
                  'Login to Join'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
