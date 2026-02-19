'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { MicOff } from 'lucide-react';
import type { VoiceUser } from '@/types';

export interface VideoGridProps {
  users: VoiceUser[];
  selfVideo?: boolean;
  selfStream?: boolean;
  localVideoStream?: MediaStream | null;
  localScreenStream?: MediaStream | null;
  currentUserId?: string;
  className?: string;
}

// Extended video user for display (includes self)
interface VideoUserDisplay extends Partial<VoiceUser> {
  userId: string;
  username: string;
  selfVideo?: boolean;
  selfMute?: boolean;
  selfDeaf?: boolean;
  selfStream?: boolean;
  videoStream?: MediaStream;
  screenStream?: MediaStream;
  audioStream?: MediaStream;
  isSpeaking?: boolean;
  avatar?: string;
  isSelf?: boolean;
}

export function VideoGrid({
  users,
  selfVideo,
  selfStream,
  localVideoStream,
  localScreenStream,
  currentUserId,
  className,
}: VideoGridProps) {
  const videoUsers = users.filter((u) => u.selfVideo || u.videoStream);
  const streamUsers = users.filter((u) => u.selfStream || u.screenStream);

  // Include self if showing video
  const allVideoUsers: VideoUserDisplay[] = selfVideo
    ? [
        {
          userId: currentUserId || 'self',
          username: 'You',
          selfVideo: true,
          selfMute: false,
          selfDeaf: false,
          selfStream: false,
          videoStream: localVideoStream || undefined,
          isSpeaking: false,
          isSelf: true,
        },
        ...videoUsers,
      ]
    : videoUsers;

  // Calculate grid layout
  const count = allVideoUsers.length + (selfStream ? 1 : 0) + streamUsers.length;
  const columns = count <= 2 ? 1 : count <= 4 ? 2 : 3;

  if (count === 0) {
    return null;
  }

  return (
    <div className={cn('grid gap-2 p-2', className)} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {/* Screen shares */}
      {selfStream && localScreenStream && (
        <ScreenShareItem stream={localScreenStream} username="You" />
      )}
      {streamUsers.map((user) => (
        <ScreenShareItem
          key={`stream-${user.sessionId || user.userId}`}
          stream={user.screenStream}
          username={user.username}
        />
      ))}

      {/* Video users */}
      {allVideoUsers.map((user) => (
        <VideoItem key={user.sessionId || user.userId} user={user} />
      ))}
    </div>
  );
}

function VideoItem({ user }: { user: VideoUserDisplay }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  // Handle video stream
  useEffect(() => {
    const video = videoRef.current;
    if (video && user.videoStream) {
      video.srcObject = user.videoStream;
      // Check if video track is actually playing
      const videoTrack = user.videoStream.getVideoTracks()[0];
      if (videoTrack && videoTrack.readyState === 'live') {
        setHasVideo(true);
      } else {
        setHasVideo(false);
      }
    } else {
      // No video stream - hide video element
      setHasVideo(false);
      if (video) {
        video.srcObject = null;
      }
    }
    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [user.videoStream]);

  // Handle audio stream (separate from video for remote users)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && user.audioStream && !user.isSelf) {
      audio.srcObject = user.audioStream;
    }
    return () => {
      if (audio) {
        audio.srcObject = null;
      }
    };
  }, [user.audioStream, user.isSelf]);

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-background-elevated">
      {/* Always render video element so ref can be set */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted // Always mute video element - we use separate audio element
        className={cn(
          "h-full w-full object-cover",
          !hasVideo && "hidden"
        )}
      />

      {/* Separate audio element for remote users */}
      {!user.isSelf && <audio ref={audioRef} autoPlay />}

      {/* Show avatar when no video */}
      {!hasVideo && (
        <div className="flex h-full w-full items-center justify-center">
          <Avatar
            src={user.avatar}
            alt={user.username}
            size="xl"
          />
        </div>
      )}

      {/* Username overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1 bg-black/50 px-2 py-1">
        {user.selfMute && <MicOff className="h-3 w-3 text-red-400" />}
        <span className="text-xs text-white truncate">{user.username}</span>
      </div>

      {/* Speaking indicator */}
      {user.isSpeaking && (
        <div className="absolute inset-0 border-2 border-green-500 rounded-lg pointer-events-none" />
      )}
    </div>
  );
}

function ScreenShareItem({ stream, username }: { stream?: MediaStream; username: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Handle audio in screen share (if present)
  useEffect(() => {
    if (audioRef.current && stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-background-elevated col-span-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted // Mute video, use separate audio element
        className="h-full w-full object-contain"
      />
      <audio ref={audioRef} autoPlay />
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
        <span className="text-xs text-white">{username}'s screen</span>
      </div>
    </div>
  );
}
