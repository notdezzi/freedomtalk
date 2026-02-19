'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Users, Wifi, Hash, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useServers, useJoinServer } from '@/features/servers';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

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
    online_count?: number;
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
  const { user, isAuthenticated } = useAuth();
  const { data: servers = [], isLoading: serversLoading } = useServers();
  const joinServer = useJoinServer();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<InvitePreview | null>(null);

  const code = params.code as string;

  useEffect(() => {
    // Don't wait for auth - invite preview is public
    const fetchPreview = async () => {
      console.log('[InvitePage] Fetching preview for code:', code);
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.previewInvite(code);
        console.log('[InvitePage] Preview response:', response);
        console.log('[InvitePage] Response data:', JSON.stringify(response.data, null, 2));

        if (!response.success) {
          const errorCode = response.error?.code;
          console.log('[InvitePage] Error code:', errorCode);
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
          console.log('[InvitePage] No server in response data');
          setError('Server information not available');
          setPreview(null);
          return;
        }

        console.log('[InvitePage] Setting preview:', response.data);
        setPreview(response.data);
      } catch (err) {
        console.error('[InvitePage] Error fetching preview:', err);
        setError('Failed to load invite. Please check the link and try again.');
        setPreview(null);
      } finally {
        console.log('[InvitePage] Setting loading to false');
        setLoading(false);
      }
    };

    if (code) {
      fetchPreview();
    }
  }, [code]);

  const handleJoin = async () => {
    if (!isAuthenticated || !user) {
      // Not logged in - redirect to login page with return URL
      router.push(`/auth/login?redirect=/invite/${code}`);
      return;
    }

    if (!preview?.server) return;

    // Check if already a member (only if servers are loaded)
    if (!serversLoading && servers.length > 0) {
      const alreadyMember = servers.some(s => s.id === preview.server!.id);
      if (alreadyMember) {
        router.push(`/app/servers/${preview.server.id}/channels/first`);
        return;
      }
    }

    // Join the server
    joinServer.mutate(code, {
      onSuccess: (data) => {
        console.log('[InvitePage] Join success:', data);
        if (data?.server) {
          router.push(`/app/servers/${data.server.id}/channels/first`);
        }
      },
      onError: (err) => {
        console.error('[InvitePage] Join error:', err);
        setError('Failed to join server. Please try again.');
      },
    });
  };

  const handleGoHome = () => {
    router.push('/app');
  };

  // Loading state
  if (loading) {
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
        <div className="bg-background-elevated rounded-xl p-6 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Invite</h1>
          <p className="text-foreground-muted mb-6">{error}</p>
          <button
            onClick={handleGoHome}
            className="w-full px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-accent transition-colors"
          >
            Go to FreedomTalk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-background-elevated rounded-xl p-6 max-w-lg w-full">
        {/* Server Preview */}
        {preview?.server && (
          <>
            {/* Banner / Icon */}
            <div className="relative -m-6 mb-6 h-32 bg-gradient-to-br from-blue-600/30 to-purple-600/30 rounded-t-xl flex items-center justify-center">
              <div className="w-24 h-24 rounded-2xl bg-background-surface shadow-xl flex items-center justify-center overflow-hidden border-4 border-background">
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
              <h1 className="text-2xl font-bold text-foreground mb-2">{preview.server.name}</h1>
              <div className="flex items-center justify-center gap-4 text-sm text-foreground-muted">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{preview.server.member_count.toLocaleString()} Members</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span>{(preview.server.online_count ?? 0).toLocaleString()} Online</span>
                </div>
              </div>
            </div>

            {/* Channel info */}
            {preview.channel && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background-surface/50 mb-4">
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
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleGoHome}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg transition-colors',
                  'bg-background-surface text-foreground hover:bg-background-elevated hover:text-foreground',
                  (joinServer.isPending || serversLoading) && 'opacity-50 cursor-not-allowed'
                )}
                disabled={joinServer.isPending || serversLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={joinServer.isPending || serversLoading}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2',
                  'bg-accent text-foreground hover:bg-accent',
                  (joinServer.isPending || serversLoading) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {joinServer.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : serversLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : isAuthenticated ? (
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
