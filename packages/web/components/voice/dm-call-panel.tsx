'use client';

import { useState, useEffect, useCallback } from 'react';
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
  PhoneOff,
  Phone,
  PhoneMissed,
  Timer,
} from 'lucide-react';

interface DMCallPanelProps {
  channelId: string;
  recipient: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  };
  onJoinCall: () => void;
  className?: string;
}

export function DMCallPanel({ channelId, recipient, onJoinCall, className }: DMCallPanelProps) {
  const {
    isConnected,
    currentChannelId,
    users,
    selfMute,
    selfDeaf,
    selfVideo,
  } = useVoiceStore();

  const {
    toggleMute,
    toggleDeafen,
    toggleVideo,
    leaveChannel,
  } = useVoiceConnection();

  const [callDuration, setCallDuration] = useState(0);

  // Check if we're in a call in this specific DM channel
  const isInThisCall = isConnected && currentChannelId === channelId;

  // Track call duration
  useEffect(() => {
    if (isInThisCall) {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCallDuration(0);
    }
  }, [isInThisCall]);

  // Format duration as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get users in this call
  const callUsers = users.filter((u) => u.channelId === channelId);

  // If not in this call, show nothing
  if (!isInThisCall) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col border-b border-border bg-background-elevated',
        className
      )}
      style={{ backgroundColor: '#1e1f22' }}
    >
      {/* Call info header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-foreground">
            Voice Call
          </span>
          <div className="flex items-center gap-1 text-xs text-foreground-muted">
            <Timer className="h-3 w-3" />
            <span>{formatDuration(callDuration)}</span>
          </div>
        </div>
        <span className="text-xs text-foreground-muted">
          {callUsers.length} participant{callUsers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Users in call */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
        {callUsers.map((user) => (
          <div
            key={user.sessionId}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg min-w-[60px]',
              user.isSpeaking && 'bg-success/10 ring-1 ring-success/30'
            )}
          >
            <Avatar
              src={user.avatar}
              alt={user.username}
              size="md"
              isSpeaking={user.isSpeaking}
              isMuted={user.selfMute}
              isDeafened={user.selfDeaf}
            />
            <span className="text-xs text-foreground truncate max-w-[60px]">
              {user.username}
            </span>
            <div className="flex items-center gap-1">
              {user.selfMute && <MicOff className="h-3 w-3 text-foreground-subtle" />}
              {user.selfDeaf && <VolumeX className="h-3 w-3 text-foreground-subtle" />}
              {user.selfVideo && <Video className="h-3 w-3 text-success" />}
            </div>
          </div>
        ))}
      </div>

      {/* Call controls */}
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
          icon={<PhoneOff className="h-5 w-5" />}
          active
          activeColor="red"
          onClick={leaveChannel}
          title="End Call"
        />
      </div>
    </div>
  );
}

interface DMCallButtonsProps {
  channelId: string;
  recipientId: string;
  onJoinCall: () => void;
  className?: string;
}

export function DMCallButtons({ channelId, recipientId, onJoinCall, className }: DMCallButtonsProps) {
  const {
    isConnected,
    currentChannelId,
    isConnecting,
  } = useVoiceStore();

  const { joinChannel } = useVoiceConnection();

  // Check if we're already in a call (in this or another channel)
  const isInThisCall = isConnected && currentChannelId === channelId;
  const isInOtherCall = isConnected && currentChannelId && currentChannelId !== channelId;

  // Start a voice call
  const startVoiceCall = useCallback(async () => {
    if (isInOtherCall) {
      // Already in another call, need to leave first
      return;
    }

    if (isInThisCall) {
      // Already in this call
      return;
    }

    try {
      await joinChannel(channelId);
      onJoinCall();
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  }, [channelId, joinChannel, onJoinCall, isInThisCall, isInOtherCall]);

  // If already in this call, don't show the buttons
  if (isInThisCall) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        onClick={startVoiceCall}
        disabled={isConnecting || !!isInOtherCall}
        className={cn(
          'rounded-full p-2 transition-colors',
          isInOtherCall
            ? 'bg-background-surface text-foreground-subtle cursor-not-allowed'
            : 'bg-background-surface text-foreground hover:bg-success hover:text-foreground'
        )}
        title={isInOtherCall ? 'Already in another call' : 'Start Voice Call'}
      >
        {isConnecting ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground-subtle border-t-transparent" />
        ) : (
          <Phone className="h-5 w-5" />
        )}
      </button>
      <button
        onClick={startVoiceCall}
        disabled={isConnecting || !!isInOtherCall}
        className={cn(
          'rounded-full p-2 transition-colors',
          isInOtherCall
            ? 'bg-background-surface text-foreground-subtle cursor-not-allowed'
            : 'bg-background-surface text-foreground hover:bg-success hover:text-foreground'
        )}
        title={isInOtherCall ? 'Already in another call' : 'Start Video Call'}
      >
        {isConnecting ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground-subtle border-t-transparent" />
        ) : (
          <Video className="h-5 w-5" />
        )}
      </button>
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
