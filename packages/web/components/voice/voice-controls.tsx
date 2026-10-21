'use client';

import { cn } from '@/lib/utils';
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

export interface VoiceControlsProps {
  className?: string;
}

export function VoiceControls({ className }: VoiceControlsProps) {
  const selfMute = useVoiceStore((s) => s.selfMute);
  const selfDeaf = useVoiceStore((s) => s.selfDeaf);
  const selfVideo = useVoiceStore((s) => s.selfVideo);
  const selfStream = useVoiceStore((s) => s.selfStream);
  const isConnected = useVoiceStore((s) => s.isConnected);

  const {
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
    leaveChannel,
  } = useVoiceConnection();

  if (!isConnected) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 border-t border-border bg-background-elevated px-4 py-3',
        className
      )}
    >
      {/* Mute button */}
      <VoiceControlButton
        icon={selfMute ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        active={selfMute}
        activeColor="red"
        onClick={toggleMute}
        title={selfMute ? 'Unmute' : 'Mute'}
      />

      {/* Deafen button */}
      <VoiceControlButton
        icon={selfDeaf ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        active={selfDeaf}
        activeColor="red"
        onClick={toggleDeafen}
        title={selfDeaf ? 'Undeafen' : 'Deafen'}
      />

      {/* Video button */}
      <VoiceControlButton
        icon={selfVideo ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        active={selfVideo}
        activeColor="green"
        onClick={toggleVideo}
        title={selfVideo ? 'Stop Video' : 'Start Video'}
      />

      {/* Screen share button */}
      <VoiceControlButton
        icon={selfStream ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        active={selfStream}
        activeColor="green"
        onClick={toggleScreenShare}
        title={selfStream ? 'Stop Screen Share' : 'Share Screen'}
      />

      {/* Leave button */}
      <VoiceControlButton
        icon={<PhoneOff className="h-5 w-5" />}
        active
        activeColor="red"
        onClick={leaveChannel}
        title="Leave Voice"
        isToggle={false}
      />
    </div>
  );
}

interface VoiceControlButtonProps {
  icon: React.ReactNode;
  active: boolean;
  activeColor: 'green' | 'red';
  onClick: () => void;
  title: string;
  /** Whether the button toggles a state (gets aria-pressed) */
  isToggle?: boolean;
}

function VoiceControlButton({
  icon,
  active,
  activeColor,
  onClick,
  title,
  isToggle = true,
}: VoiceControlButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={title}
      aria-pressed={isToggle ? active : undefined}
      className={cn(
        'rounded-full p-3 transition-colors',
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
