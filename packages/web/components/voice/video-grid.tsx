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
  isSpeaking?: boolean;
  avatar?: string;
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
          key={`stream-${user.userId}`}
          stream={user.screenStream}
          username={user.username}
        />
      ))}

      {/* Video users */}
      {allVideoUsers.map((user) => (
        <VideoItem key={user.userId} user={user} />
      ))}
    </div>
  );
}

function VideoItem({ user }: { user: VideoUserDisplay }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (videoRef.current && user.videoStream) {
      videoRef.current.srcObject = user.videoStream;
      setHasVideo(true);
    }
  }, [user.videoStream]);

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800">
      {hasVideo && user.videoStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={user.userId === 'self'}
          className="h-full w-full object-cover"
        />
      ) : (
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

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800 col-span-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-contain"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
        <span className="text-xs text-white">{username}'s screen</span>
      </div>
    </div>
  );
}
