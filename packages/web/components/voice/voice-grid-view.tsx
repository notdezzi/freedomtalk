'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { MicOff, Volume2, Monitor } from 'lucide-react';
import { useVoiceStore, useAuthStore } from '@/stores';
import { VideoGrid } from './video-grid';
import { VoiceControls } from './voice-controls';
import type { VoiceUser } from '@/types';

export interface VoiceGridViewProps {
  channelId: string;
  channelName?: string;
  className?: string;
}

export function VoiceGridView({ channelId, channelName, className }: VoiceGridViewProps) {
  const currentUser = useAuthStore((s) => s.user);
  const {
    users,
    currentChannelId,
    selfVideo,
    selfStream,
    selfMute,
    selfDeaf,
    localVideoStream,
    localScreenStream,
  } = useVoiceStore();

  // Get current user's speaking state from store
  const currentSessionId = useVoiceStore((s) => s.sessionId);
  const currentUserInStore = users.find((u) => u.sessionId === currentSessionId);
  const isSelfSpeaking = currentUserInStore?.isSpeaking ?? false;

  // Get users in this voice channel (exclude current user from remote users)
  const voiceUsers = users.filter((u) => u.channelId === channelId && u.userId !== currentUser?.id);

  // Separate users with video/stream from audio-only
  const videoUsers = voiceUsers.filter((u) => u.selfVideo || u.videoStream);
  const streamUsers = voiceUsers.filter((u) => u.selfStream || u.screenStream);
  const audioOnlyUsers = voiceUsers.filter(
    (u) => !u.selfVideo && !u.videoStream && !u.selfStream && !u.screenStream
  );

  // Include current user in audio-only if not showing video
  const showSelfInAudioOnly = !selfVideo && !selfStream && currentUser;
  const allAudioOnlyUsers = showSelfInAudioOnly
    ? [
        {
          userId: currentUser.id,
          username: 'You',
          avatar: currentUser.avatar,
          channelId,
          sessionId: currentSessionId || 'self',
          selfMute: selfMute,
          selfDeaf: selfDeaf,
          selfVideo: false,
          selfStream: false,
          isSpeaking: isSelfSpeaking,
        } as VoiceUser,
        ...audioOnlyUsers,
      ]
    : audioOnlyUsers;

  // Calculate grid columns for audio-only users
  const audioCount = allAudioOnlyUsers.length;
  const audioColumns = audioCount <= 2 ? 2 : audioCount <= 6 ? 3 : 4;

  // Check if we have any video or screen shares
  const hasVideo = videoUsers.length > 0 || selfVideo;
  const hasStream = streamUsers.length > 0 || selfStream;

  return (
    <div className={cn('flex h-full flex-col bg-gray-900', className)}>
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Channel header */}
        <div className="mb-4 flex items-center gap-2 px-2">
          <Volume2 className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-semibold text-white">
            {channelName || 'Voice Channel'}
          </h2>
          <span className="text-sm text-gray-400">
            {voiceUsers.length + (showSelfInAudioOnly ? 1 : 0)}{' '}
            {voiceUsers.length + (showSelfInAudioOnly ? 1 : 0) === 1 ? 'user' : 'users'}
          </span>
        </div>

        {/* Screen shares - full width at top */}
        {(hasStream || hasVideo) && (
          <div className="mb-4">
            <VideoGrid
              users={videoUsers}
              selfVideo={selfVideo}
              selfStream={selfStream}
              localVideoStream={localVideoStream}
              localScreenStream={localScreenStream}
              currentUserId={currentUser?.id}
            />
          </div>
        )}

        {/* Audio-only users grid */}
        {allAudioOnlyUsers.length > 0 && (
          <div
            className={cn('grid gap-3', `grid-cols-${audioColumns}`)}
            style={{ gridTemplateColumns: `repeat(${audioColumns}, 1fr)` }}
          >
            {allAudioOnlyUsers.map((user) => (
              <AudioOnlyTile key={user.sessionId} user={user} isSelf={user.userId === currentUser?.id} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {allAudioOnlyUsers.length === 0 && !hasVideo && !hasStream && (
          <div className="flex h-64 items-center justify-center text-gray-500">
            <div className="text-center">
              <Volume2 className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p>Connected to voice</p>
              <p className="text-sm">Waiting for others to join...</p>
            </div>
          </div>
        )}
      </div>

      {/* Control bar at bottom */}
      <VoiceControls />
    </div>
  );
}

interface AudioOnlyTileProps {
  user: VoiceUser;
  isSelf?: boolean;
}

function AudioOnlyTile({ user, isSelf }: AudioOnlyTileProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const speakingRef = useRef<boolean>(user.isSpeaking || false);

  // Update ref when speaking state changes
  useEffect(() => {
    speakingRef.current = user.isSpeaking || false;
  }, [user.isSpeaking]);

  // Play audio stream for remote users
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && user.audioStream && !isSelf) {
      audio.srcObject = user.audioStream;
    }
    return () => {
      if (audio) {
        audio.srcObject = null;
      }
    };
  }, [user.audioStream, isSelf]);

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg p-4 transition-all duration-200',
        'bg-gray-800 hover:bg-gray-750',
        user.isSpeaking && 'ring-2 ring-green-500 bg-green-500/10'
      )}
    >
      {/* Hidden audio element for remote users */}
      {!isSelf && <audio ref={audioRef} autoPlay />}

      {/* Avatar with speaking ring */}
      <div className="relative">
        <Avatar
          src={user.avatar}
          alt={user.username}
          size="lg"
          className={cn(
            'transition-all duration-200',
            user.isSpeaking && 'ring-2 ring-green-400 ring-offset-2 ring-offset-gray-800'
          )}
        />

        {/* Mute indicator overlay */}
        {user.selfMute && (
          <div className="absolute -bottom-1 -right-1 rounded-full bg-red-500 p-1">
            <MicOff className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Deafen indicator */}
        {user.selfDeaf && (
          <div className="absolute -bottom-1 -right-1 rounded-full bg-red-500 p-1">
            <Volume2 className="h-3 w-3 text-white line-through" />
          </div>
        )}
      </div>

      {/* Username */}
      <span className="mt-2 max-w-full truncate text-sm text-gray-300">
        {isSelf ? 'You' : user.username}
      </span>

      {/* Speaking indicator text */}
      {user.isSpeaking && (
        <span className="text-xs text-green-400">Speaking...</span>
      )}
    </div>
  );
}
