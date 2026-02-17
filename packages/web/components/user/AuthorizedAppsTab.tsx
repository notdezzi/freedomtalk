'use client';

import { useState, useEffect } from 'react';
import { Key, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface AuthorizedApp {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  permissions: string[];
  authorizedAt: string;
  lastUsedAt: string;
}

export default function AuthorizedAppsTab() {
  const [apps, setApps] = useState<AuthorizedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ tokens?: AuthorizedApp[] } | AuthorizedApp[]>('/api/v1/oauth/tokens');
      if (response.success && response.data) {
        const data = response.data;
        if (Array.isArray(data)) {
          setApps(data);
        } else if (data.tokens) {
          setApps(data.tokens);
        }
      }
    } catch {
      // Empty on error
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (appId: string) => {
    if (!confirm('Are you sure you want to revoke access for this app?')) return;

    setRevoking(appId);
    try {
      await apiClient.delete(`/api/v1/oauth/tokens/${appId}`);
      setApps(apps.filter((app) => app.id !== appId));
    } catch {
      // Handle error silently
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h4 className="font-medium">Authorized Apps</h4>
        <p className="text-sm text-foreground-muted">Apps that have access to your account</p>
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-12 text-foreground-muted">
          <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No authorized apps</p>
          <p className="text-xs mt-1">Apps you authorize will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <div key={app.id} className="card bg-background-surface flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center overflow-hidden">
                  {app.icon ? (
                    <img src={app.icon} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Key className="w-5 h-5 text-accent" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{app.name}</p>
                  <p className="text-xs text-foreground-muted">
                    Authorized {new Date(app.authorizedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRevoke(app.id)}
                disabled={revoking === app.id}
                className="btn btn-ghost text-error hover:bg-error/10"
              >
                {revoking === app.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Security Tip</p>
            <p className="text-xs text-warning/80 mt-1">
              Review your authorized apps regularly. Revoke access to any apps you no longer use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
