'use client';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { useVoiceStore } from '@/stores';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  Monitor,
  Phone,
  PhoneOff,
} from 'lucide-react';
import type { VoiceChannel } from '@/types';

export interface VoicePanelProps {
  channel?: VoiceChannel;
  className?: string;
}

export function VoicePanel({ channel, className }: VoicePanelProps) {
  const {
    isConnected,
    currentChannelId,
    users,
    selfMute,
    selfDeaf,
    selfVideo,
    selfStream,
    setSelfMute,
    setSelfDeaf,
    setSelfVideo,
    disconnect,
  } = useVoiceStore();

  if (!isConnected || !currentChannelId) {
    return null;
  }

  const voiceUsers = users.filter((u) => u.channelId === currentChannelId);

  return (
    <div
      className={cn(
        'flex flex-col border-t border-gray-700 bg-gray-850',
        className
      )}
      style={{ backgroundColor: '#1e1f22' }}
    >
      {/* Channel info */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-white">
            {channel?.name || 'Voice Channel'}
          </span>
        </div>
      </div>

      {/* Users in voice */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {voiceUsers.map((user) => (
          <VoiceUserItem key={user.userId} user={user} />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 border-t border-gray-700 p-2">
        <VoiceControlButton
          icon={selfMute ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          active={selfMute}
          activeColor="red"
          onClick={() => setSelfMute(!selfMute)}
          title={selfMute ? 'Unmute' : 'Mute'}
        />
        <VoiceControlButton
          icon={selfDeaf ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          active={selfDeaf}
          activeColor="red"
          onClick={() => setSelfDeaf(!selfDeaf)}
          title={selfDeaf ? 'Undeafen' : 'Deafen'}
        />
        <VoiceControlButton
          icon={selfVideo ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          active={selfVideo}
          activeColor="green"
          onClick={() => setSelfVideo(!selfVideo)}
          title={selfVideo ? 'Stop Video' : 'Start Video'}
        />
        <VoiceControlButton
          icon={<Monitor className="h-5 w-5" />}
          active={selfStream}
          activeColor="green"
          onClick={() => {}}
          title="Share Screen"
        />
        <VoiceControlButton
          icon={<PhoneOff className="h-5 w-5" />}
          active
          activeColor="red"
          onClick={disconnect}
          title="Disconnect"
        />
      </div>
    </div>
  );
}

function VoiceUserItem({ user }: { user: { userId: string; username: string; avatar?: string; selfMute: boolean; selfDeaf: boolean; speaking?: boolean } }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded px-2 py-1',
        user.speaking && 'bg-green-500/10 border border-green-500/30'
      )}
    >
      <Avatar
        src={user.avatar}
        alt={user.username}
        size="sm"
        isSpeaking={user.speaking}
        isMuted={user.selfMute}
        isDeafened={user.selfDeaf}
      />
      <span className="flex-1 truncate text-sm text-gray-300">{user.username}</span>
      {user.selfMute && <MicOff className="h-3 w-3 text-gray-500" />}
      {user.selfDeaf && <VolumeX className="h-3 w-3 text-gray-500" />}
    </div>
  );
}

function VoiceControlButton({
  icon,
  active,
  activeColor,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  active: boolean;
  activeColor: 'green' | 'red';
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full p-2 transition-colors',
        active
          ? activeColor === 'green'
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-gray-600 text-gray-300 hover:bg-gray-500 hover:text-white'
      )}
      title={title}
    >
      {icon}
    </button>
  );
}
