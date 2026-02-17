'use client';

import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Device {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  os?: string;
  browser?: string;
  ipAddress: string;
  location?: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function DevicesTab() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ sessions?: Device[] } | Device[]>('/api/v1/users/me/sessions');
      if (response.success && response.data) {
        const data = response.data;
        if (Array.isArray(data)) {
          setDevices(data);
        } else if (data.sessions) {
          setDevices(data.sessions);
        }
      }
    } catch {
      // Empty on error
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    if (!confirm('Are you sure you want to sign out this device?')) return;

    setRevoking(sessionId);
    try {
      await apiClient.delete(`/api/v1/users/me/sessions/${sessionId}`);
      setDevices(devices.filter((d) => d.id !== sessionId));
    } catch {
      // Handle error silently
    } finally {
      setRevoking(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
      case 'tablet':
        return <Smartphone className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
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
        <h4 className="font-medium">Active Sessions</h4>
        <p className="text-sm text-foreground-muted">Manage your active sessions across devices</p>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-12 text-foreground-muted">
          <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No active sessions</p>
          <p className="text-xs mt-1">Your sessions will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div key={device.id} className="card bg-background-surface">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center flex-shrink-0">
                    {getDeviceIcon(device.deviceType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {device.browser || 'Unknown Browser'}
                        {device.os && ` on ${device.os}`}
                      </p>
                      {device.isCurrent && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground-muted mt-1">
                      {device.location || 'Unknown location'} • {device.ipAddress}
                    </p>
                    <p className="text-xs text-foreground-muted mt-1">
                      Last active {new Date(device.lastActive).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!device.isCurrent && (
                  <button
                    onClick={() => handleRevoke(device.id)}
                    disabled={revoking === device.id}
                    className="btn btn-ghost text-error hover:bg-error/10 p-2"
                  >
                    {revoking === device.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
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
              If you see any sessions you don&apos;t recognize, revoke them immediately and change your password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
