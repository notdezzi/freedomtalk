'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { useWebSocketStore } from '@/stores/websocketStore';
import type { ConnectionStatus } from '@/stores/websocketStore';

const statusConfig: Record<ConnectionStatus, { icon: typeof Wifi; color: string; label: string }> = {
  connected: {
    icon: Wifi,
    color: 'text-success',
    label: 'Connected',
  },
  connecting: {
    icon: Loader2,
    color: 'text-warning',
    label: 'Connecting...',
  },
  disconnected: {
    icon: WifiOff,
    color: 'text-foreground-muted',
    label: 'Disconnected',
  },
  reconnecting: {
    icon: Loader2,
    color: 'text-warning',
    label: 'Reconnecting...',
  },
  error: {
    icon: AlertCircle,
    color: 'text-error',
    label: 'Connection Error',
  },
};

export default function ConnectionStatus() {
  const { status, error, reconnectAttempts } = useWebSocketStore();
  const [showStatus, setShowStatus] = useState(false);

  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimated = status === 'connecting' || status === 'reconnecting';

  // Show status indicator when not connected
  useEffect(() => {
    if (status !== 'connected') {
      setShowStatus(true);
    } else {
      // Hide after 2 seconds when connected
      const timer = setTimeout(() => setShowStatus(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!showStatus && status === 'connected') {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-300 ${
        status === 'connected'
          ? 'bg-success/20 border border-success/30'
          : status === 'error'
          ? 'bg-error/20 border border-error/30'
          : 'bg-background-elevated border border-border'
      }`}
    >
      <Icon
        className={`w-4 h-4 ${config.color} ${isAnimated ? 'animate-spin' : ''}`}
      />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
      {status === 'reconnecting' && reconnectAttempts > 0 && (
        <span className="text-xs text-foreground-muted">
          (attempt {reconnectAttempts})
        </span>
      )}
      {error && status === 'error' && (
        <span className="text-xs text-error ml-1">- {error}</span>
      )}
    </div>
  );
}
