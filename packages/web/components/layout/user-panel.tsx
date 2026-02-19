'use client';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { useAuthStore, useVoiceStore, useUIStore } from '@/stores';
import { useVoiceConnection } from '@/hooks';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
} from 'lucide-react';

export function UserPanel() {
  const user = useAuthStore((s) => s.user);
  const openModal = useUIStore((s) => s.openModal);

  const selfMute = useVoiceStore((s) => s.selfMute);
  const selfDeaf = useVoiceStore((s) => s.selfDeaf);
  const isConnectedToVoice = useVoiceStore((s) => s.isConnected);

  const { toggleMute, toggleDeafen } = useVoiceConnection();

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-0.5',
        'bg-transparent border border-border mb-4 ml-2 mr-2 rounded-lg'
      )}
      style={{ backgroundColor: '#232428' }}
    >
      {/* User info */}
      <button className="flex flex-1 items-center gap-2 rounded px-1 py-1 transition-colors cursor-pointer">
        <Avatar
          src={user?.avatar}
          alt={user?.username || 'User'}
          size="md"
          status="online"
          showStatus
        />
        <div className="flex-1 overflow-hidden text-left">
          <p className="truncate text-sm font-medium text-foreground">
            {user?.displayName || user?.username || 'User'}
          </p>
          <p className="truncate text-xs text-foreground-muted">
            {user?.customStatus || 'Online'}
          </p>
        </div>
      </button>

      {/* Controls */}
      <div className="flex items-center gap-0.5">
        {/* Mute button - only functional when in voice */}
        <button
          onClick={toggleMute}
          disabled={!isConnectedToVoice}
          className={cn(
            'rounded p-1.5 transition-colors',
            selfMute && isConnectedToVoice
              ? 'bg-error/20 text-error hover:bg-error/30'
              : 'text-foreground-muted hover:bg-background-surface hover:text-foreground',
            !isConnectedToVoice && 'opacity-50 cursor-not-allowed'
          )}
          aria-label={selfMute ? 'Unmute' : 'Mute'}
          title={isConnectedToVoice ? (selfMute ? 'Unmute' : 'Mute') : 'Join voice to mute'}
        >
          {selfMute ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>

        {/* Deafen button - only functional when in voice */}
        <button
          onClick={toggleDeafen}
          disabled={!isConnectedToVoice}
          className={cn(
            'rounded p-1.5 transition-colors',
            selfDeaf && isConnectedToVoice
              ? 'bg-error/20 text-error hover:bg-error/30'
              : 'text-foreground-muted hover:bg-background-surface hover:text-foreground',
            !isConnectedToVoice && 'opacity-50 cursor-not-allowed'
          )}
          aria-label={selfDeaf ? 'Undeafen' : 'Deafen'}
          title={isConnectedToVoice ? (selfDeaf ? 'Undeafen' : 'Deafen') : 'Join voice to deafen'}
        >
          {selfDeaf ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>

        {/* Settings button - directly opens user settings */}
        <button
          onClick={() => openModal('user-settings')}
          className="rounded p-1.5 text-foreground-muted hover:bg-background-surface hover:text-foreground transition-colors"
          aria-label="User settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
