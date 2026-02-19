'use client';

import { useState } from 'react';
import { Mic, MicOff, Headphones, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/uiStore';
import { useVoiceStore } from '@/stores/voiceStore';
import { useSocket } from '@/hooks/useSocket';
import { apiClient } from '@/lib/api-client';

function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return 'bg-success';
    case 'idle':
      return 'bg-warning';
    case 'dnd':
      return 'bg-error';
    default:
      return 'bg-foreground-subtle';
  }
}

export default function UserPanel() {
  const { user } = useAuth();
  const { openModal } = useUIStore();
  const { isConnected, selfMute, selfDeaf, setSelfMute, setSelfDeaf, sessionId } = useVoiceStore();
  const { updateVoiceState } = useSocket();
  const [status] = useState<'online' | 'idle' | 'dnd' | 'offline'>('online');

  const handleToggleMute = async () => {
    const newMute = !selfMute;
    setSelfMute(newMute);
    if (isConnected && sessionId) {
      await apiClient.updateVoiceState(sessionId, { selfMute: newMute });
      updateVoiceState({ selfMute: newMute });
    }
  };

  const handleToggleDeaf = async () => {
    const newDeaf = !selfDeaf;
    const newMute = newDeaf ? true : selfMute;
    setSelfDeaf(newDeaf);
    if (isConnected && sessionId) {
      await apiClient.updateVoiceState(sessionId, { selfDeaf: newDeaf, selfMute: newMute });
      updateVoiceState({ selfDeaf: newDeaf, selfMute: newMute });
    }
  };

  if (!user) return null;

  return (
    <div className="px-2 pb-2 border-r border-border">
      <div className="h-[52px] px-2 flex items-center gap-2 bg-background-surface border border-border rounded-lg">
        {/* Avatar */}
        <div className="relative">
          <button
            onClick={() => openModal('user-profile')}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center overflow-hidden"
          >
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-background">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </button>
          {/* Status indicator */}
          <div
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background-surface ${getStatusColor(
              status
            )}`}
          />
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user.username}</p>
          <p className="text-xs text-foreground-subtle">
            {status === 'online' ? 'Online' : status}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleToggleMute}
            className={`p-1.5 rounded hover:bg-background-elevated transition-colors ${
              selfMute ? 'text-error' : 'text-foreground-muted hover:text-foreground'
            }`}
            aria-label={selfMute ? 'Unmute' : 'Mute'}
          >
            {selfMute ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={handleToggleDeaf}
            className={`p-1.5 rounded hover:bg-background-elevated transition-colors ${
              selfDeaf ? 'text-error' : 'text-foreground-muted hover:text-foreground'
            }`}
            aria-label={selfDeaf ? 'Undeafen' : 'Deafen'}
          >
            {selfDeaf ? (
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" />
              </svg>
            ) : (
              <Headphones className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => openModal('user-settings')}
            className="p-1.5 rounded hover:bg-background-elevated text-foreground-muted hover:text-foreground transition-colors"
            aria-label="User settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
