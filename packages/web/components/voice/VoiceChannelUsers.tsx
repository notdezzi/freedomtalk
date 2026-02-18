'use client';

import { Mic, MicOff, Volume2, VolumeX, Video, MonitorUp } from 'lucide-react';
import { useVoiceStore, VoiceUser } from '@/stores/voiceStore';

interface VoiceChannelUsersProps {
  channelId: string;
}

function UserItem({ user }: { user: VoiceUser }) {
  const displayName = user.displayName || user.username;

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-background-surface/50 group">
      {/* Avatar */}
      <div className="relative w-6 h-6 rounded-full bg-accent flex items-center justify-center overflow-hidden flex-shrink-0">
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-background">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="text-sm text-foreground-muted group-hover:text-foreground truncate flex-1">
        {displayName}
      </span>

      {/* Status Icons */}
      <div className="flex items-center gap-1">
        {user.selfVideo && (
          <span title="Video on"><Video className="w-3 h-3 text-accent" /></span>
        )}
        {user.selfStream && (
          <span title="Streaming"><MonitorUp className="w-3 h-3 text-accent" /></span>
        )}
        {user.selfMute ? (
          <span title="Muted"><MicOff className="w-3 h-3 text-foreground-muted" /></span>
        ) : (
          <span title="Unmuted"><Mic className="w-3 h-3 text-foreground-muted" /></span>
        )}
        {user.selfDeaf && (
          <span title="Deafened"><VolumeX className="w-3 h-3 text-foreground-muted" /></span>
        )}
      </div>
    </div>
  );
}

export default function VoiceChannelUsers({ channelId }: VoiceChannelUsersProps) {
  const { getUsersByChannel } = useVoiceStore();
  const users = getUsersByChannel(channelId);

  if (users.length === 0) return null;

  return (
    <div className="py-1">
      {users.map((user) => (
        <UserItem key={user.sessionId || user.userId} user={user} />
      ))}
    </div>
  );
}
