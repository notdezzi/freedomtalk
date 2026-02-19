'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MessageCircle, ArrowLeft, Monitor, Smartphone, Tablet, MapPin, Clock, Trash2, LogOut, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { Session } from '@/stores';

function getDeviceIcon(type: Session['deviceType']) {
  switch (type) {
    case 'mobile':
      return Smartphone;
    case 'tablet':
      return Tablet;
    default:
      return Monitor;
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function SessionsContent() {
  const router = useRouter();
  const { sessions, logout, logoutOtherSessions, terminateSession, refreshSessions, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  const handleTerminateSession = async (sessionId: string) => {
    setTerminatingId(sessionId);
    await terminateSession(sessionId);
    setTerminatingId(null);
  };

  const handleLogoutOthers = async () => {
    setIsLoading(true);
    const currentSession = sessions.find((s) => s.isCurrent);
    if (currentSession) {
      await logoutOtherSessions(currentSession.id);
    }
    setIsLoading(false);
    setShowConfirmLogout(false);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await refreshSessions();
    setIsLoading(false);
  };

  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/app"
        className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to app
      </Link>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-background" />
        </div>
        <span className="text-xl font-bold">
          Freedom<span className="gradient-text">Talk</span>
        </span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Active Sessions</h1>
        <p className="text-foreground-muted">
          Manage your active sessions across all devices. Log out of any suspicious activity immediately.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="btn btn-secondary text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        {otherSessions.length > 0 && (
          <button
            onClick={() => setShowConfirmLogout(true)}
            className="btn btn-secondary text-sm text-error border-error/30 hover:bg-error/10"
          >
            <LogOut className="w-4 h-4" />
            Log out other sessions
          </button>
        )}
      </div>

      {/* Current session */}
      {currentSession && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
            Current Session
          </h2>
          <div className="card border-accent/30 bg-accent/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center">
                {(() => {
                  const Icon = getDeviceIcon(currentSession.deviceType);
                  return <Icon className="w-6 h-6 text-accent" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{currentSession.deviceName}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-accent-muted text-accent text-xs font-medium">
                    Active Now
                  </span>
                </div>
                <p className="text-sm text-foreground-muted mb-2">
                  {currentSession.browser} on {currentSession.os}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-foreground-subtle">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {currentSession.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Logged in {formatDate(currentSession.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other sessions */}
      {otherSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
            Other Sessions ({otherSessions.length})
          </h2>
          <div className="space-y-3">
            {otherSessions.map((session) => (
              <div key={session.id} className="card">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-background-surface flex items-center justify-center">
                    {(() => {
                      const Icon = getDeviceIcon(session.deviceType);
                      return <Icon className="w-6 h-6 text-foreground-muted" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1">{session.deviceName}</h3>
                    <p className="text-sm text-foreground-muted mb-2">
                      {session.browser} on {session.os}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-foreground-subtle">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {session.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Last active {formatDate(session.lastActive)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTerminateSession(session.id)}
                    disabled={terminatingId === session.id}
                    className="btn btn-ghost text-sm text-error hover:bg-error/10"
                  >
                    {terminatingId === session.id ? (
                      <div className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {otherSessions.length === 0 && currentSession && (
        <div className="text-center py-8">
          <p className="text-foreground-muted">No other active sessions.</p>
        </div>
      )}

      {/* Confirm logout modal */}
      {showConfirmLogout && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <h2 className="text-lg font-bold">Log out other sessions?</h2>
            </div>
            <p className="text-foreground-muted mb-6">
              This will log you out of all other devices. You&apos;ll need to log in again on those devices.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmLogout(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutOthers}
                disabled={isLoading}
                className="btn bg-warning text-background hover:bg-warning/90 flex-1"
              >
                {isLoading ? 'Logging out...' : 'Log out others'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout all button */}
      <div className="mt-8 pt-8 border-t border-border">
        <button
          onClick={logout}
          className="btn btn-secondary text-error border-error/30 hover:bg-error/10 w-full"
        >
          <LogOut className="w-5 h-5" />
          Log out of all sessions
        </button>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="animate-fade-in text-center">
      <div className="w-16 h-16 rounded-full bg-secondary-muted flex items-center justify-center mx-auto mb-6">
        <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Loading sessions...</h1>
    </div>
  );
}

export default function SessionsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SessionsContent />
    </Suspense>
  );
}
