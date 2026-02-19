'use client';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { Dropdown } from '@/components/ui/dropdown';
import { useAuthStore, useVoiceStore, useUIStore } from '@/stores';
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
  const setSelfMute = useVoiceStore((s) => s.setSelfMute);
  const setSelfDeaf = useVoiceStore((s) => s.setSelfDeaf);

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
        'bg-gray-850 border-t border-gray-700'
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
        {/* Mute button */}
        <button
          onClick={() => setSelfMute(!selfMute)}
          className={cn(
            'rounded p-1.5 transition-colors',
            selfMute
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          )}
          aria-label={selfMute ? 'Unmute' : 'Mute'}
          title={selfMute ? 'Unmute' : 'Mute'}
        >
          {selfMute ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>

        {/* Deafen button */}
        <button
          onClick={() => setSelfDeaf(!selfDeaf)}
          className={cn(
            'rounded p-1.5 transition-colors',
            selfDeaf
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          )}
          aria-label={selfDeaf ? 'Undeafen' : 'Deafen'}
          title={selfDeaf ? 'Undeafen' : 'Deafen'}
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
        />
      </div>
    </div>
  );
}
