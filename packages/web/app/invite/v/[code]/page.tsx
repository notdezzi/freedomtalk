'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Users, AlertCircle, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useServers, useJoinServer } from '@/features/servers';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';

interface VanityPreview {
  server: {
    id: string;
    name: string;
    icon: string | null;
    description?: string;
    memberCount: number;
  };
  vanityUrl: string;
}

export default function VanityInvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { data: servers = [], isLoading: serversLoading } = useServers();
  const joinServer = useJoinServer();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<VanityPreview | null>(null);

  const code = params.code as string;

  useEffect(() => {
    const fetchVanityPreview = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.getVanityPreview(code);

        if (response.success && response.data) {
          setPreview(response.data as VanityPreview);
        } else {
          setError('This vanity URL is invalid or no longer exists.');
        }
      } catch (err) {
        setError('Failed to load invite. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchVanityPreview();
    }
  }, [code]);

  // Check if user is already a member
  const isAlreadyMember = preview && servers.some(s => s.id === preview.server.id);

  const handleJoin = () => {
    if (!preview || !isAuthenticated) return;

    // Use a default invite code or redirect to server if already a member
    if (isAlreadyMember) {
      router.push(`/app/servers/${preview.server.id}`);
      return;
    }

    // Redirect to regular invite flow with a generated invite
    // For now, just show a message
    router.push(`/invite/${code}`);
  };

  if (loading || serversLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-background-elevated rounded-lg p-8 text-center shadow-lg">
          <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Invite Invalid</h1>
          <p className="text-foreground-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  const { server } = preview;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-background-elevated rounded-lg overflow-hidden shadow-lg">
        {/* Server Banner/Header */}
        <div className="h-24 bg-gradient-to-r from-accent/20 to-accent/10 relative">
          {server.icon && (
            <div className="absolute -bottom-8 left-6">
              <Avatar
                src={server.icon}
                alt={server.name}
                size="xl"
                className="ring-4 ring-background-elevated"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="pt-12 pb-6 px-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">{server.name}</h1>

          {server.description && (
            <p className="text-foreground-muted text-sm mb-4">{server.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-foreground-muted mb-6">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{server.memberCount} members</span>
            </div>
            <div className="flex items-center gap-1">
              <LinkIcon className="h-4 w-4" />
              <span>/v/{code}</span>
            </div>
          </div>

          {isAlreadyMember ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-success bg-success/10 rounded-lg px-4 py-3">
                <CheckCircle className="h-5 w-5" />
                <span>You're already a member of this server!</span>
              </div>
              <button
                onClick={handleJoin}
                className={cn(
                  'w-full py-3 rounded-lg font-medium transition-colors',
                  'bg-accent text-foreground hover:bg-accent/90'
                )}
              >
                Continue to Server
              </button>
            </div>
          ) : isAuthenticated ? (
            <button
              onClick={handleJoin}
              disabled={joinServer.isPending}
              className={cn(
                'w-full py-3 rounded-lg font-medium transition-colors',
                'bg-accent text-foreground hover:bg-accent/90',
                joinServer.isPending && 'opacity-50 cursor-not-allowed'
              )}
            >
              {joinServer.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              ) : (
                'Join Server'
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-foreground-muted text-center">
                You need to be logged in to join this server.
              </p>
              <button
                onClick={() => router.push('/login')}
                className={cn(
                  'w-full py-3 rounded-lg font-medium transition-colors',
                  'bg-accent text-foreground hover:bg-accent/90'
                )}
              >
                Log In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
