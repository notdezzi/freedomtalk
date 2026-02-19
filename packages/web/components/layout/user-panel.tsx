'use client';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { Dropdown } from '@/components/ui/dropdown';
import { useAuthStore, useVoiceStore, useUIStore } from '@/stores';
import { useVoiceConnection } from '@/hooks';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Headphones,
  LogOut,
} from 'lucide-react';

export function UserPanel() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const openModal = useUIStore((s) => s.openModal);

  const selfMute = useVoiceStore((s) => s.selfMute);
  const selfDeaf = useVoiceStore((s) => s.selfDeaf);
  const isConnectedToVoice = useVoiceStore((s) => s.isConnected);

  const { toggleMute, toggleDeafen } = useVoiceConnection();

  const settingsItems = [
    {
      id: 'settings',
      label: 'User Settings',
      icon: <Settings className="h-4 w-4" />,
      onClick: () => openModal('user-settings'),
    },
    {
      id: 'logout',
      label: 'Log Out',
      icon: <LogOut className="h-4 w-4" />,
      danger: true,
      onClick: logout,
    },
  ];

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-2',
        'bg-transparent border border-gray-700 mb-1 ml-1 mr-1 rounded-lg'
      )}
      style={{ backgroundColor: '#232428' }}
    >
      {/* User info */}
      <button className="flex flex-1 items-center gap-2 rounded px-1 py-1 hover:bg-gray-700 transition-colors">
        <Avatar
          src={user?.avatar}
          alt={user?.username || 'User'}
          size="md"
          status="online"
          showStatus
        />
        <div className="flex-1 overflow-hidden text-left">
          <p className="truncate text-sm font-medium text-white">
            {user?.displayName || user?.username || 'User'}
          </p>
          <p className="truncate text-xs text-gray-400">
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
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200',
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
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200',
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

        {/* Settings dropdown */}
        <Dropdown
          trigger={
            <button
              className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
              aria-label="User settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          }
          items={settingsItems}
          align="end"
          direction="up"
        />
      </div>
    </div>
  );
}
