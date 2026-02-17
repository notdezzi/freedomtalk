'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Hash, Bell, Users, Search, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useServerStore } from '@/stores/serverStore';

function HomePageContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { servers, currentServerId } = useServerStore();

  // Redirect to first server if available
  useEffect(() => {
    if (!isLoading && isAuthenticated && servers.length > 0 && !currentServerId) {
      // Optionally auto-select first server
      // setCurrentServer(servers[0].id);
      // router.push(`/app/servers/${servers[0].id}`);
    }
  }, [isLoading, isAuthenticated, servers, currentServerId, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-4 border-b border-border shadow-md">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-accent" />
          <span className="font-semibold">Friends</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <nav className="flex items-center gap-1">
          <button className="px-3 py-1.5 rounded text-sm font-medium bg-background-surface text-foreground">
            Online
          </button>
          <button className="px-3 py-1.5 rounded text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-surface transition-colors">
            All
          </button>
          <button className="px-3 py-1.5 rounded text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-surface transition-colors">
            Pending
          </button>
          <button className="px-3 py-1.5 rounded text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-surface transition-colors">
            Blocked
          </button>
          <button className="px-3 py-1.5 rounded text-sm font-medium text-accent hover:bg-accent-muted transition-colors">
            Add Friend
          </button>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
            <input
              type="text"
              className="w-36 h-7 pl-8 pr-2 rounded text-sm bg-background-surface border border-border focus:border-accent focus:outline-none transition-colors"
              placeholder="Search"
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Welcome message */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-background" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome, {user?.username}!</h1>
            <p className="text-foreground-muted">
              You&apos;re ready to start chatting. Add friends or join a server to get started.
            </p>
          </div>

          {/* Quick actions */}
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/app?add-friend=true')}
              className="card flex items-center gap-4 hover:border-accent transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">Add Friends</h3>
                <p className="text-sm text-foreground-muted">
                  Connect with friends by sending them your username
                </p>
              </div>
            </button>

            <button
              onClick={() => router.push('/discover')}
              className="card flex items-center gap-4 hover:border-accent transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary-muted flex items-center justify-center">
                <Hash className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold">Discover Servers</h3>
                <p className="text-sm text-foreground-muted">
                  Find communities that match your interests
                </p>
              </div>
            </button>
          </div>

          {/* DM placeholder */}
          <div className="mt-12">
            <h2 className="text-lg font-semibold mb-4">Direct Messages</h2>
            <div className="card text-center py-12">
              <div className="w-16 h-16 rounded-full bg-background-surface flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-foreground-subtle" />
              </div>
              <h3 className="font-semibold mb-2">No direct messages yet</h3>
              <p className="text-sm text-foreground-muted mb-4">
                Send a message to a friend to start a conversation
              </p>
              <button className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Start a conversation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomePageContent />
    </Suspense>
  );
}
