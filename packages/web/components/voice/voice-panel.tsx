'use client';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { useVoiceStore } from '@/stores';
import { useVoiceConnection } from '@/hooks';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
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
  } = useVoiceStore();

  const {
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
    leaveChannel,
  } = useVoiceConnection();

  if (!isConnected || !currentChannelId) {
    return null;
  }

  const voiceUsers = users.filter((u) => u.channelId === currentChannelId);

  return (
    <div
      className={cn(
        'flex flex-col border-t border-border bg-background-elevated',
        className
      )}
      style={{ backgroundColor: '#1e1f22' }}
    >
      {/* Channel info */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-foreground">
            {channel?.name || 'Voice Channel'}
          </span>
        </div>
      </div>

      {/* Users in voice */}
      <div className="flex-1 overflow-y-auto px-2 py-1 max-h-32">
        {voiceUsers.map((user) => (
          <VoiceUserItem key={user.sessionId} user={user} />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 border-t border-border p-2">
        <VoiceControlButton
          icon={selfMute ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          active={selfMute}
          activeColor="red"
          onClick={toggleMute}
          title={selfMute ? 'Unmute' : 'Mute'}
        />
        <VoiceControlButton
          icon={selfDeaf ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          active={selfDeaf}
          activeColor="red"
          onClick={toggleDeafen}
          title={selfDeaf ? 'Undeafen' : 'Deafen'}
        />
        <VoiceControlButton
          icon={selfVideo ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          active={selfVideo}
          activeColor="green"
          onClick={toggleVideo}
          title={selfVideo ? 'Stop Video' : 'Start Video'}
        />
        <VoiceControlButton
          icon={selfStream ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          active={selfStream}
          activeColor="green"
          onClick={toggleScreenShare}
          title={selfStream ? 'Stop Screen Share' : 'Share Screen'}
        />
        <VoiceControlButton
          icon={<PhoneOff className="h-5 w-5" />}
          active
          activeColor="red"
          onClick={leaveChannel}
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
        user.speaking && 'bg-success/10 border border-success/30'
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
      <span className="flex-1 truncate text-sm text-foreground">{user.username}</span>
      {user.selfMute && <MicOff className="h-3 w-3 text-foreground-subtle" />}
      {user.selfDeaf && <VolumeX className="h-3 w-3 text-foreground-subtle" />}
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
            ? 'bg-success text-foreground hover:bg-success/80'
            : 'bg-error text-foreground hover:bg-error/80'
          : 'bg-background-elevated text-foreground hover:bg-background-surface hover:text-foreground'
      )}
      title={title}
    >
      {icon}
    </button>
  );
}
